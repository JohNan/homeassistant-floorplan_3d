"""Persistent storage manager and validation for floorplan_3d."""

from __future__ import annotations

import base64
import copy
import hashlib
import logging
import os
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from .const import (
    ALLOWED_BLUEPRINT_MIMES,
    DEFAULT_FLOORPLAN_ID,
    DEFAULT_FLOORPLAN_NAME,
    MAX_BLUEPRINT_BYTES,
    STORAGE_KEY,
    STORAGE_VERSION,
)

try:
    from homeassistant.helpers.storage import Store
except ImportError:
    Store = None  # type: ignore[assignment, misc]

_LOGGER = logging.getLogger(__name__)


class RevisionConflictError(Exception):
    """Raised when saving a floorplan with a stale expected revision."""


class ValidationError(Exception):
    """Raised when floorplan document or blueprint payload fails validation."""


class InMemoryStore:
    """In-memory storage fallback for unit testing without Home Assistant."""

    def __init__(self, initial_data: dict[str, Any] | None = None) -> None:
        """Initialize in-memory store."""
        self._data = copy.deepcopy(initial_data) if initial_data is not None else None

    async def async_load(self) -> dict[str, Any] | None:
        """Load stored data."""
        return copy.deepcopy(self._data) if self._data is not None else None

    async def async_save(self, data: dict[str, Any]) -> None:
        """Save data to in-memory store."""
        self._data = copy.deepcopy(data)


def create_default_floorplan(
    floorplan_id: str = DEFAULT_FLOORPLAN_ID,
    name: str = DEFAULT_FLOORPLAN_NAME,
) -> dict[str, Any]:
    """Create a default FloorplanDocument matching SPEC.md Section 3."""
    now_iso = datetime.now(UTC).isoformat()
    return {
        "id": floorplan_id,
        "name": name,
        "revision": 1,
        "created_at": now_iso,
        "updated_at": now_iso,
        "unit": "m",
        "grid_size": 0.1,
        "ambient_config": {
            "mode": "adaptive_contrast",
            "sun_entity_id": "sun.sun",
            "base_ambient_intensity": 0.22,
            "wall_color": "#e2e8f0",
            "floor_color": "#334155",
            "background_color": "#0f172a",
        },
        "floors": [
            {
                "id": "floor_ground",
                "name": "Ground Floor",
                "level_index": 0,
                "elevation": 0.0,
                "wall_height": 2.6,
                "slab_thickness": 0.15,
                "ha_floor_id": None,
                "blueprint": None,
                "default_camera": {
                    "projection": "perspective",
                    "position": [0.0, 12.0, 10.0],
                    "target": [0.0, 0.0, 0.0],
                    "zoom": 1.0,
                },
                "nodes": [],
                "walls": [],
                "openings": [],
                "rooms": [],
                "furniture": [],
                "entities": [],
            }
        ],
    }


class FloorplanStorageManager:
    """Manages persistence, validation, optimistic locking, and blueprint assets."""

    def __init__(self, hass: Any, store: Any | None = None) -> None:
        """Initialize the storage manager."""
        self.hass = hass
        if store is not None:
            self._store = store
        elif Store is not None:
            self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        else:
            self._store = InMemoryStore()

        self._data: dict[str, Any] = {
            "version": STORAGE_VERSION,
            "floorplans": {},
        }
        self._subscribers: list[tuple[str | None, Callable[[dict[str, Any]], None]]] = []

    def _get_blueprints_dir(self) -> str:
        """Get the absolute filesystem path for blueprint assets."""
        if hasattr(self.hass, "config") and hasattr(self.hass.config, "path"):
            return str(self.hass.config.path("www", "floorplan_3d", "blueprints"))
        config_dir = getattr(self.hass, "config_dir", ".")
        return os.path.join(config_dir, "www", "floorplan_3d", "blueprints")

    async def async_load(self) -> None:
        """Load floorplan data from persistent store, seeding default if empty."""
        raw_data = await self._store.async_load()
        if (
            not raw_data
            or not isinstance(raw_data, dict)
            or "floorplans" not in raw_data
            or not raw_data["floorplans"]
        ):
            default_fp = create_default_floorplan()
            self._data = {
                "version": STORAGE_VERSION,
                "floorplans": {default_fp["id"]: default_fp},
            }
            await self._store.async_save(self._data)
        else:
            self._data = {
                "version": raw_data.get("version", STORAGE_VERSION),
                "floorplans": dict(raw_data.get("floorplans", {})),
            }

    def list_floorplans(self) -> list[dict[str, Any]]:
        """Return summary list of all floorplans."""
        summaries: list[dict[str, Any]] = []
        for fp in self._data.get("floorplans", {}).values():
            floors_summary = [
                {
                    "id": fl.get("id", ""),
                    "name": fl.get("name", ""),
                    "level_index": fl.get("level_index", 0),
                }
                for fl in fp.get("floors", [])
                if isinstance(fl, dict)
            ]
            floors_summary.sort(key=lambda x: x["level_index"])
            summaries.append(
                {
                    "id": fp.get("id", ""),
                    "name": fp.get("name", ""),
                    "revision": fp.get("revision", 1),
                    "updated_at": fp.get("updated_at", ""),
                    "floors": floors_summary,
                }
            )
        summaries.sort(key=lambda x: x["id"])
        return summaries

    def get_floorplan(self, floorplan_id: str) -> dict[str, Any] | None:
        """Return full FloorplanDocument by ID or None."""
        fp = self._data.get("floorplans", {}).get(floorplan_id)
        if fp is None:
            return None
        return copy.deepcopy(fp)

    def _validate_floorplan(self, doc: dict[str, Any]) -> None:
        """Validate floorplan document schema."""
        if not isinstance(doc, dict):
            raise ValidationError("Floorplan document must be a dictionary")

        fp_id = doc.get("id")
        if not fp_id or not isinstance(fp_id, str) or not fp_id.strip():
            raise ValidationError("Floorplan requires a non-empty string 'id'")

        name = doc.get("name")
        if not name or not isinstance(name, str) or not name.strip():
            raise ValidationError("Floorplan requires a non-empty string 'name'")

        floors = doc.get("floors")
        if not isinstance(floors, list):
            raise ValidationError("Floorplan 'floors' must be a list")

        unit = doc.get("unit")
        if unit != "m":
            raise ValidationError(f"Invalid world unit '{unit}': must be 'm'")

    def _notify_subscribers(self, event: dict[str, Any]) -> None:
        """Notify registered subscribers of an update or deletion."""
        target_fp_id = event.get("floorplan_id")
        for fp_filter, callback in list(self._subscribers):
            if fp_filter is None or fp_filter == target_fp_id:
                try:
                    callback(event)
                except Exception as exc:  # noqa: BLE001
                    _LOGGER.warning("Error notifying floorplan subscriber: %s", exc)

    async def async_save_floorplan(
        self, doc: dict[str, Any], expected_revision: int | None = None
    ) -> dict[str, Any]:
        """Validate and save floorplan document with optimistic revision locking."""
        self._validate_floorplan(doc)
        fp_id = doc["id"]
        saved_doc = copy.deepcopy(doc)

        existing = self._data.get("floorplans", {}).get(fp_id)
        if existing is not None:
            current_rev = existing.get("revision", 1)
            if expected_revision is not None and current_rev != expected_revision:
                raise RevisionConflictError(
                    f"Revision conflict for floorplan '{fp_id}': expected revision {expected_revision}, but current is {current_rev}"
                )
            new_rev = current_rev + 1
        else:
            new_rev = 1

        now_iso = datetime.now(UTC).isoformat()
        saved_doc["revision"] = new_rev
        saved_doc["updated_at"] = now_iso
        if "created_at" not in saved_doc or not saved_doc["created_at"]:
            saved_doc["created_at"] = now_iso

        self._data.setdefault("floorplans", {})[fp_id] = copy.deepcopy(saved_doc)
        await self._store.async_save(self._data)

        self._notify_subscribers(
            {
                "event": "updated",
                "floorplan_id": fp_id,
                "floorplan": copy.deepcopy(saved_doc),
            }
        )

        return saved_doc

    async def async_delete_floorplan(self, floorplan_id: str) -> bool:
        """Delete floorplan by ID, remove associated blueprint assets, and notify subscribers."""
        if floorplan_id not in self._data.get("floorplans", {}):
            return False

        del self._data["floorplans"][floorplan_id]
        await self._store.async_save(self._data)

        safe_fp = re.sub(r"[^a-zA-Z0-9_-]", "", floorplan_id)
        if safe_fp:
            def _cleanup() -> None:
                bdir = self._get_blueprints_dir()
                if os.path.isdir(bdir):
                    prefix = f"{safe_fp}_"
                    for fname in os.listdir(bdir):
                        if fname.startswith(prefix):
                            try:
                                os.remove(os.path.join(bdir, fname))
                            except OSError as exc:
                                _LOGGER.debug("Could not remove blueprint file %s: %s", fname, exc)

            if hasattr(self.hass, "async_add_executor_job"):
                await self.hass.async_add_executor_job(_cleanup)
            else:
                _cleanup()

        self._notify_subscribers(
            {
                "event": "deleted",
                "floorplan_id": floorplan_id,
            }
        )
        return True

    async def async_save_blueprint(
        self, floorplan_id: str, floor_id: str, mime_type: str, data_base64: str
    ) -> str:
        """Validate, decode, and store a reference blueprint image file."""
        if mime_type not in ALLOWED_BLUEPRINT_MIMES:
            raise ValidationError(
                f"Unsupported blueprint MIME type: '{mime_type}'. Allowed: {list(ALLOWED_BLUEPRINT_MIMES.keys())}"
            )

        if "," in data_base64:
            data_base64 = data_base64.split(",", 1)[1]

        try:
            raw_bytes = base64.b64decode(data_base64)
        except Exception as exc:
            raise ValidationError(f"Invalid base64 payload: {exc}") from exc

        if len(raw_bytes) > MAX_BLUEPRINT_BYTES:
            raise ValidationError(
                f"Blueprint file size ({len(raw_bytes)} bytes) exceeds limit of {MAX_BLUEPRINT_BYTES} bytes"
            )

        safe_fp = re.sub(r"[^a-zA-Z0-9_-]", "", floorplan_id) or "floorplan"
        safe_fl = re.sub(r"[^a-zA-Z0-9_-]", "", floor_id) or "floor"
        sha = hashlib.sha256(raw_bytes).hexdigest()[:10]
        ext = ALLOWED_BLUEPRINT_MIMES[mime_type]
        filename = f"{safe_fp}_{safe_fl}_{sha}{ext}"

        def _write() -> None:
            bdir = self._get_blueprints_dir()
            os.makedirs(bdir, exist_ok=True)
            target_path = os.path.join(bdir, filename)
            with open(target_path, "wb") as f:
                f.write(raw_bytes)

        if hasattr(self.hass, "async_add_executor_job"):
            await self.hass.async_add_executor_job(_write)
        else:
            _write()

        return f"/local/floorplan_3d/blueprints/{filename}"

    def subscribe(
        self,
        floorplan_id: str | None,
        callback: Callable[[dict[str, Any]], None],
    ) -> Callable[[], None]:
        """Register a real-time event listener and return an unsubscription callable."""
        listener = (floorplan_id, callback)
        self._subscribers.append(listener)

        def _unsubscribe() -> None:
            if listener in self._subscribers:
                self._subscribers.remove(listener)

        return _unsubscribe
