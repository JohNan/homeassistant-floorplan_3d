"""3D Floorplan Editor & Card integration for Home Assistant."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any

from .const import (
    CARD_BUNDLE_FILENAME,
    DATA_STORAGE_MANAGER,
    DOMAIN,
    PANEL_BUNDLE_FILENAME,
    PANEL_COMPONENT_NAME,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STATIC_URL_PATH,
    VERSION,
)
from .storage import FloorplanStorageManager
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: Any, config: dict[str, Any]) -> bool:
    """Set up the 3D Floorplan Editor & Card component."""
    return True


def _compute_bundle_cache_tag(dist_path: Path, filename: str) -> str:
    """Compute a content-based cache tag (VERSION-sha256[:10]) for a frontend bundle."""
    bundle_path = dist_path / filename
    try:
        if bundle_path.is_file():
            digest = hashlib.sha256(bundle_path.read_bytes()).hexdigest()[:10]
            return f"{VERSION}-{digest}"
    except OSError as exc:
        _LOGGER.debug("Could not hash bundle %s: %s", bundle_path, exc)
    return VERSION


async def _async_get_bundle_cache_tag(hass: Any, filename: str) -> str:
    """Resolve content-based cache tag off the event loop."""
    dist_path = Path(__file__).parent / "frontend" / "dist"
    if hasattr(hass, "async_add_executor_job"):
        return await hass.async_add_executor_job(
            _compute_bundle_cache_tag, dist_path, filename
        )
    return _compute_bundle_cache_tag(dist_path, filename)


async def _async_register_static_paths(hass: Any) -> None:
    """Register static path for pre-compiled frontend bundles."""
    dist_path = Path(__file__).parent / "frontend" / "dist"

    http = getattr(hass, "http", None)
    if http is None:
        return

    if hasattr(http, "async_register_static_paths"):
        try:
            from homeassistant.components.http import StaticPathConfig

            await http.async_register_static_paths(
                [StaticPathConfig(STATIC_URL_PATH, str(dist_path), cache_headers=False)]
            )
            return
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not async_register_static_paths: %s", exc)

    if hasattr(http, "register_static_path"):
        try:
            http.register_static_path(
                STATIC_URL_PATH, str(dist_path), cache_headers=False
            )
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not register_static_path: %s", exc)


async def _async_register_panel(hass: Any) -> None:
    """Register admin-only 2D/3D editor sidebar panel."""
    panel_cache_tag = await _async_get_bundle_cache_tag(hass, PANEL_BUNDLE_FILENAME)
    panel_module_url = f"{STATIC_URL_PATH}/{PANEL_BUNDLE_FILENAME}?v={panel_cache_tag}"
    custom_panel_config = {
        "_panel_custom": {
            "name": PANEL_COMPONENT_NAME,
            "embed_iframe": False,
            "trust_external": False,
            "module_url": panel_module_url,
        },
        "module_url": panel_module_url,
    }

    try:
        from homeassistant.components import panel_custom

        if hasattr(panel_custom, "async_register_panel"):
            await panel_custom.async_register_panel(
                hass,
                webcomponent_name=PANEL_COMPONENT_NAME,
                frontend_url_path=PANEL_URL_PATH,
                sidebar_title=PANEL_TITLE,
                sidebar_icon=PANEL_ICON,
                module_url=panel_module_url,
                embed_iframe=False,
                require_admin=True,
            )
            return
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("Could not register panel via panel_custom: %s", exc)

    try:
        from homeassistant.components import frontend

        if hasattr(frontend, "async_register_built_in_panel"):
            res = frontend.async_register_built_in_panel(
                hass,
                component_name="custom",
                sidebar_title=PANEL_TITLE,
                sidebar_icon=PANEL_ICON,
                frontend_url_path=PANEL_URL_PATH,
                require_admin=True,
                config=custom_panel_config,
                update=True,
            )
            if hasattr(res, "__await__"):
                await res
            return
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("Could not register panel via frontend module: %s", exc)

    frontend_comp = getattr(
        getattr(hass, "components", None), "frontend", getattr(hass, "frontend", None)
    )
    if frontend_comp and hasattr(frontend_comp, "async_register_built_in_panel"):
        try:
            func = frontend_comp.async_register_built_in_panel
            try:
                res = func(
                    hass,
                    component_name="custom",
                    sidebar_title=PANEL_TITLE,
                    sidebar_icon=PANEL_ICON,
                    frontend_url_path=PANEL_URL_PATH,
                    require_admin=True,
                    config=custom_panel_config,
                    update=True,
                )
            except TypeError:
                res = func(
                    component_name="custom",
                    sidebar_title=PANEL_TITLE,
                    sidebar_icon=PANEL_ICON,
                    frontend_url_path=PANEL_URL_PATH,
                    require_admin=True,
                    config=custom_panel_config,
                    update=True,
                )
            if hasattr(res, "__await__"):
                await res
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not register panel via frontend component: %s", exc)


async def _async_register_lovelace_card(hass: Any) -> None:
    """Register Lovelace card bundle via frontend extra JS and Lovelace resources."""
    card_cache_tag = await _async_get_bundle_cache_tag(hass, CARD_BUNDLE_FILENAME)
    card_url = f"{STATIC_URL_PATH}/{CARD_BUNDLE_FILENAME}?v={card_cache_tag}"

    # 1. Inject module via frontend.add_extra_js_url so the card is always loaded
    # immediately across storage-mode and YAML-mode dashboards.
    try:
        from homeassistant.components import frontend

        if hasattr(frontend, "add_extra_js_url"):
            frontend.add_extra_js_url(hass, card_url)
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("Could not call frontend.add_extra_js_url: %s", exc)

    frontend_comp = getattr(
        getattr(hass, "components", None), "frontend", getattr(hass, "frontend", None)
    )
    if frontend_comp and hasattr(frontend_comp, "add_extra_js_url"):
        try:
            try:
                frontend_comp.add_extra_js_url(hass, card_url)
            except TypeError:
                frontend_comp.add_extra_js_url(card_url)
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not call frontend_comp.add_extra_js_url: %s", exc)

    # 2. Also register/update in Lovelace ResourceStorageCollection when available
    lovelace = hass.data.get("lovelace")
    if not lovelace:
        return

    resources = (
        lovelace.get("resources")
        if isinstance(lovelace, dict)
        else getattr(lovelace, "resources", None)
    )
    if not resources:
        return

    try:
        if (
            hasattr(resources, "loaded")
            and not resources.loaded
            and hasattr(resources, "async_load")
        ):
            await resources.async_load()

        get_items = getattr(resources, "async_items", None) or getattr(
            resources, "async_get_items", None
        )
        if not callable(get_items):
            return

        items = get_items()
        for item in items:
            url = item.get("url", "")
            if url.startswith(f"{STATIC_URL_PATH}/{CARD_BUNDLE_FILENAME}"):
                if url != card_url and hasattr(resources, "async_update_item"):
                    await resources.async_update_item(
                        item["id"], {"res_type": "module", "url": card_url}
                    )
                return

        if hasattr(resources, "async_create_item"):
            await resources.async_create_item(
                {"res_type": "module", "url": card_url}
            )
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("Could not register lovelace resource: %s", exc)


async def async_setup_entry(hass: Any, entry: Any) -> bool:
    """Set up 3D Floorplan Editor & Card from a config entry."""
    storage_manager = FloorplanStorageManager(hass)
    await storage_manager.async_load()

    hass.data.setdefault(DOMAIN, {})[DATA_STORAGE_MANAGER] = storage_manager

    async_register_websocket_commands(hass)
    await _async_register_static_paths(hass)
    await _async_register_panel(hass)
    await _async_register_lovelace_card(hass)

    return True


async def async_unload_entry(hass: Any, entry: Any) -> bool:
    """Unload 3D Floorplan Editor & Card config entry."""
    try:
        from homeassistant.components import frontend

        if hasattr(frontend, "async_remove_panel"):
            frontend.async_remove_panel(hass, PANEL_URL_PATH)
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("Could not remove panel via frontend module: %s", exc)

    frontend_comp = getattr(
        getattr(hass, "components", None), "frontend", getattr(hass, "frontend", None)
    )
    if frontend_comp and hasattr(frontend_comp, "async_remove_panel"):
        try:
            try:
                frontend_comp.async_remove_panel(hass, PANEL_URL_PATH)
            except TypeError:
                frontend_comp.async_remove_panel(PANEL_URL_PATH)
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not remove panel via frontend component: %s", exc)

    if DOMAIN in hass.data:
        hass.data.pop(DOMAIN, None)

    return True
