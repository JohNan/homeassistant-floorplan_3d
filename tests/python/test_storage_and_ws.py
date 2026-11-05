"""Comprehensive pytest test suite for floorplan_3d Python backend."""

from __future__ import annotations

import base64
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

# Ensure repo root is on sys.path so custom_components can be imported
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import pytest

from custom_components.floorplan_3d import (
    async_setup,
    async_setup_entry,
    async_unload_entry,
)
from custom_components.floorplan_3d.config_flow import Floorplan3DConfigFlow
from custom_components.floorplan_3d.const import (
    CARD_BUNDLE_FILENAME,
    DATA_STORAGE_MANAGER,
    DEFAULT_FLOORPLAN_ID,
    DOMAIN,
    MAX_BLUEPRINT_BYTES,
    PANEL_BUNDLE_FILENAME,
    PANEL_COMPONENT_NAME,
    PANEL_URL_PATH,
    STATIC_URL_PATH,
    VERSION,
)
from custom_components.floorplan_3d.storage import (
    FloorplanStorageManager,
    InMemoryStore,
    RevisionConflictError,
    ValidationError,
    create_default_floorplan,
)
from custom_components.floorplan_3d.websocket_api import (
    SCHEMA_WS_DELETE,
    SCHEMA_WS_GET,
    SCHEMA_WS_LIST,
    SCHEMA_WS_SAVE,
    SCHEMA_WS_SUBSCRIBE,
    SCHEMA_WS_UPLOAD_BLUEPRINT,
    WS_HANDLERS,
    _decorate_ws,
    async_register_websocket_commands,
    event_message,
)

pytestmark = pytest.mark.asyncio


class MockUser:
    """Mock Home Assistant user."""

    def __init__(self, user_id: str = "user_1", is_admin: bool = True) -> None:
        self.id = user_id
        self.is_admin = is_admin


class MockConnection:
    """Mock Home Assistant WebSocket ActiveConnection."""

    def __init__(self, is_admin: bool = True) -> None:
        self.user = MockUser(is_admin=is_admin)
        self.subscriptions: dict[int, Callable[[], None]] = {}
        self.results: dict[int, Any] = {}
        self.errors: dict[int, tuple[str, str]] = {}
        self.messages: list[dict[str, Any]] = []

    def send_result(self, msg_id: int, result: Any = None) -> None:
        self.results[msg_id] = result

    def send_error(self, msg_id: int, code: str, message: str) -> None:
        self.errors[msg_id] = (code, message)

    def send_message(self, msg: dict[str, Any]) -> None:
        self.messages.append(msg)


class MockConfig:
    """Mock Home Assistant config."""

    def __init__(self, root_path: Path) -> None:
        self._root = root_path
        self.components: set[str] = {"frontend", "http", "lovelace"}

    def path(self, *parts: str) -> str:
        p = self._root.joinpath(*parts)
        return str(p)


class MockLovelaceResources:
    """Mock Lovelace storage mode resource collection."""

    def __init__(self) -> None:
        self._items: list[dict[str, Any]] = []

    def async_get_items(self) -> list[dict[str, Any]]:
        return list(self._items)

    async def async_create_item(self, item: dict[str, Any]) -> dict[str, Any]:
        item_copy = dict(item)
        item_copy["id"] = f"res_{len(self._items) + 1}"
        self._items.append(item_copy)
        return item_copy

    async def async_update_item(self, item_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        for item in self._items:
            if item.get("id") == item_id:
                item.update(updates)
                return item
        raise KeyError(item_id)


class MockLovelace:
    """Mock Lovelace data object."""

    def __init__(self) -> None:
        self.resources = MockLovelaceResources()


class MockHttp:
    """Mock Home Assistant HTTP component."""

    def __init__(self) -> None:
        self.static_paths: list[Any] = []

    async def async_register_static_paths(self, configs: list[Any]) -> None:
        self.static_paths.extend(configs)

    def register_static_path(self, url: str, path: str, cache_headers: bool = True) -> None:
        self.static_paths.append((url, path, cache_headers))


class MockFrontend:
    """Mock Home Assistant frontend component."""

    def __init__(self) -> None:
        self.panels: dict[str, dict[str, Any]] = {}

    def async_register_built_in_panel(
        self,
        hass: Any,
        component_name: str,
        sidebar_title: str,
        sidebar_icon: str,
        frontend_url_path: str,
        require_admin: bool,
        config: dict[str, Any],
        update: bool = True,
    ) -> None:
        self.panels[frontend_url_path] = {
            "component_name": component_name,
            "sidebar_title": sidebar_title,
            "sidebar_icon": sidebar_icon,
            "require_admin": require_admin,
            "config": config,
        }

    def async_remove_panel(self, hass: Any, frontend_url_path: str) -> None:
        self.panels.pop(frontend_url_path, None)


class MockComponents:
    """Mock Home Assistant components namespace."""

    def __init__(self, frontend: MockFrontend) -> None:
        self.frontend = frontend


class MockHass:
    """Mock Home Assistant instance."""

    def __init__(self, tmp_path: Path) -> None:
        self.config = MockConfig(tmp_path)
        self.data: dict[str, Any] = {"lovelace": MockLovelace()}
        self.http = MockHttp()
        self.frontend = MockFrontend()
        self.components = MockComponents(self.frontend)

    async def async_add_executor_job(
        self, target: Callable[..., Any], *args: Any
    ) -> Any:
        return target(*args)


# ---------------------------------------------------------------------------
# Storage & Data Model Tests
# ---------------------------------------------------------------------------

async def test_default_floorplan_structure() -> None:
    """Verify create_default_floorplan generates SPEC.md Section 3 compliant document."""
    doc = create_default_floorplan("test_house", "Test House")
    assert doc["id"] == "test_house"
    assert doc["name"] == "Test House"
    assert doc["revision"] == 1
    assert doc["unit"] == "m"
    assert doc["grid_size"] == 0.1
    assert "created_at" in doc
    assert "updated_at" in doc

    ambient = doc["ambient_config"]
    assert ambient["mode"] == "adaptive_contrast"
    assert ambient["sun_entity_id"] == "sun.sun"
    assert ambient["wall_color"] == "#e2e8f0"
    assert ambient["floor_color"] == "#334155"

    floors = doc["floors"]
    assert len(floors) == 1
    assert floors[0]["level_index"] == 0
    assert floors[0]["wall_height"] == 2.6
    assert floors[0]["elevation"] == 0.0


async def test_initial_store_seeding(tmp_path: Path) -> None:
    """Verify empty store automatically seeds default 'main_house' floorplan."""
    hass = MockHass(tmp_path)
    store = InMemoryStore()
    manager = FloorplanStorageManager(hass, store=store)

    await manager.async_load()
    summaries = manager.list_floorplans()
    assert len(summaries) == 1
    assert summaries[0]["id"] == DEFAULT_FLOORPLAN_ID
    assert summaries[0]["name"] == "Main House"
    assert summaries[0]["revision"] == 1
    assert len(summaries[0]["floors"]) == 1

    doc = manager.get_floorplan(DEFAULT_FLOORPLAN_ID)
    assert doc is not None
    assert doc["id"] == DEFAULT_FLOORPLAN_ID


async def test_save_floorplan_and_revision_increment(tmp_path: Path) -> None:
    """Verify saving increments revision and stores updated floorplans."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()

    doc = manager.get_floorplan(DEFAULT_FLOORPLAN_ID)
    assert doc is not None
    doc["name"] = "Main House Renovation"

    # Save with matching expected_revision
    saved = await manager.async_save_floorplan(doc, expected_revision=1)
    assert saved["revision"] == 2
    assert saved["name"] == "Main House Renovation"

    # Save without expected_revision (unconditional update)
    saved2 = await manager.async_save_floorplan(saved)
    assert saved2["revision"] == 3

    # Save a brand new floorplan
    new_fp = create_default_floorplan("guest_house", "Guest House")
    saved_new = await manager.async_save_floorplan(new_fp)
    assert saved_new["revision"] == 1

    summaries = manager.list_floorplans()
    assert len(summaries) == 2
    ids = [s["id"] for s in summaries]
    assert "guest_house" in ids
    assert DEFAULT_FLOORPLAN_ID in ids


async def test_save_floorplan_concurrency_conflict(tmp_path: Path) -> None:
    """Verify saving with stale expected_revision raises RevisionConflictError."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()

    doc = manager.get_floorplan(DEFAULT_FLOORPLAN_ID)
    assert doc is not None

    with pytest.raises(RevisionConflictError) as exc_info:
        await manager.async_save_floorplan(doc, expected_revision=99)
    assert "Revision conflict" in str(exc_info.value)


async def test_save_floorplan_schema_validation(tmp_path: Path) -> None:
    """Verify document schema validation rejects invalid structures."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()

    # Non-dictionary
    with pytest.raises(ValidationError):
        await manager.async_save_floorplan("not a dict")  # type: ignore[arg-type]

    # Missing/empty id
    with pytest.raises(ValidationError):
        await manager.async_save_floorplan({"id": "", "name": "Test", "floors": [], "unit": "m"})

    # Missing/empty name
    with pytest.raises(ValidationError):
        await manager.async_save_floorplan({"id": "fp1", "name": "", "floors": [], "unit": "m"})

    # Non-list floors
    with pytest.raises(ValidationError):
        await manager.async_save_floorplan({"id": "fp1", "name": "Test", "floors": {}, "unit": "m"})

    # Invalid unit (not metric 'm')
    with pytest.raises(ValidationError):
        await manager.async_save_floorplan({"id": "fp1", "name": "Test", "floors": [], "unit": "ft"})


async def test_delete_floorplan_and_blueprint_cleanup(tmp_path: Path) -> None:
    """Verify deleting a floorplan removes data and cleans up blueprint files."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()

    # Upload blueprint for default floorplan
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    b64_data = base64.b64encode(dummy_png).decode("ascii")
    url = await manager.async_save_blueprint(
        floorplan_id=DEFAULT_FLOORPLAN_ID,
        floor_id="ground",
        mime_type="image/png",
        data_base64=b64_data,
    )
    filename = url.split("/")[-1]
    blueprint_file = Path(hass.config.path("www", "floorplan_3d", "blueprints", filename))
    assert blueprint_file.is_file()

    # Delete floorplan
    success = await manager.async_delete_floorplan(DEFAULT_FLOORPLAN_ID)
    assert success is True
    assert manager.get_floorplan(DEFAULT_FLOORPLAN_ID) is None
    assert not blueprint_file.exists()

    # Deleting non-existent returns False
    assert await manager.async_delete_floorplan("non_existent") is False


async def test_save_blueprint_validation(tmp_path: Path) -> None:
    """Verify blueprint upload validates MIME type, size, and sanitizes paths."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())

    dummy_content = b"fake-png-binary-stream"
    b64_content = base64.b64encode(dummy_content).decode("ascii")

    # Invalid MIME type
    with pytest.raises(ValidationError) as exc:
        await manager.async_save_blueprint("fp1", "fl1", "application/pdf", b64_content)
    assert "Unsupported blueprint MIME type" in str(exc.value)

    # Invalid Base64
    with pytest.raises(ValidationError):
        await manager.async_save_blueprint("fp1", "fl1", "image/png", "!!!not-valid-base64!!!")

    # Exceeding MAX_BLUEPRINT_BYTES
    large_payload = base64.b64encode(b"X" * (MAX_BLUEPRINT_BYTES + 1024)).decode("ascii")
    with pytest.raises(ValidationError) as exc_size:
        await manager.async_save_blueprint("fp1", "fl1", "image/png", large_payload)
    assert "exceeds limit" in str(exc_size.value)

    # Path traversal attempt in floorplan_id / floor_id
    url = await manager.async_save_blueprint(
        floorplan_id="../../etc/passwd",
        floor_id="../sensitive",
        mime_type="image/webp",
        data_base64=f"data:image/webp;base64,{b64_content}",
    )
    assert url.startswith("/local/floorplan_3d/blueprints/")
    # Traversal characters (.., /) stripped
    assert "etcpasswd" in url
    assert "sensitive" in url
    assert url.endswith(".webp")


async def test_storage_subscription(tmp_path: Path) -> None:
    """Verify subscription listeners receive real-time push events and can unsubscribe."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()

    wildcard_events: list[dict[str, Any]] = []
    targeted_events: list[dict[str, Any]] = []

    unsub_wildcard = manager.subscribe(None, wildcard_events.append)
    unsub_targeted = manager.subscribe(DEFAULT_FLOORPLAN_ID, targeted_events.append)

    # Trigger update
    doc = manager.get_floorplan(DEFAULT_FLOORPLAN_ID)
    assert doc is not None
    await manager.async_save_floorplan(doc)

    assert len(wildcard_events) == 1
    assert len(targeted_events) == 1
    assert wildcard_events[0]["event"] == "updated"
    assert targeted_events[0]["event"] == "updated"

    # Save a different floorplan
    other_fp = create_default_floorplan("other_house", "Other")
    await manager.async_save_floorplan(other_fp)

    assert len(wildcard_events) == 2
    assert len(targeted_events) == 1  # Not targeted

    # Unsubscribe wildcard
    unsub_wildcard()
    await manager.async_delete_floorplan(DEFAULT_FLOORPLAN_ID)

    assert len(wildcard_events) == 2  # No new event
    assert len(targeted_events) == 2  # Received 'deleted'
    assert targeted_events[1]["event"] == "deleted"

    unsub_targeted()


# ---------------------------------------------------------------------------
# WebSocket API Handler Tests
# ---------------------------------------------------------------------------

async def test_ws_list(tmp_path: Path) -> None:
    """Test floorplan_3d/list WebSocket command."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()
    hass.data[DOMAIN] = {DATA_STORAGE_MANAGER: manager}

    conn = MockConnection(is_admin=False)
    msg = {"id": 1, "type": "floorplan_3d/list"}

    await WS_HANDLERS["floorplan_3d/list"](hass, conn, msg)
    assert 1 in conn.results
    result = conn.results[1]
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["id"] == DEFAULT_FLOORPLAN_ID


async def test_ws_get(tmp_path: Path) -> None:
    """Test floorplan_3d/get WebSocket command."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()
    hass.data[DOMAIN] = {DATA_STORAGE_MANAGER: manager}

    conn = MockConnection(is_admin=False)

    # Existing
    await WS_HANDLERS["floorplan_3d/get"](
        hass, conn, {"id": 10, "type": "floorplan_3d/get", "floorplan_id": DEFAULT_FLOORPLAN_ID}
    )
    assert 10 in conn.results
    assert conn.results[10]["id"] == DEFAULT_FLOORPLAN_ID

    # Non-existent
    await WS_HANDLERS["floorplan_3d/get"](
        hass, conn, {"id": 11, "type": "floorplan_3d/get", "floorplan_id": "unknown_fp"}
    )
    assert 11 in conn.errors
    assert conn.errors[11][0] == "not_found"


async def test_ws_save(tmp_path: Path) -> None:
    """Test floorplan_3d/save command handling admin auth, conflicts, and validation."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()
    hass.data[DOMAIN] = {DATA_STORAGE_MANAGER: manager}

    admin_conn = MockConnection(is_admin=True)
    non_admin_conn = MockConnection(is_admin=False)
    doc = manager.get_floorplan(DEFAULT_FLOORPLAN_ID)
    assert doc is not None

    # Non-admin rejected
    await WS_HANDLERS["floorplan_3d/save"](
        hass, non_admin_conn, {"id": 20, "type": "floorplan_3d/save", "floorplan": doc}
    )
    assert non_admin_conn.errors[20][0] == "unauthorized"

    # Admin success
    await WS_HANDLERS["floorplan_3d/save"](
        hass,
        admin_conn,
        {"id": 21, "type": "floorplan_3d/save", "floorplan": doc, "expected_revision": 1},
    )
    assert admin_conn.results[21]["revision"] == 2

    # Admin revision conflict
    await WS_HANDLERS["floorplan_3d/save"](
        hass,
        admin_conn,
        {"id": 22, "type": "floorplan_3d/save", "floorplan": doc, "expected_revision": 1},
    )
    assert admin_conn.errors[22][0] == "revision_conflict"

    # Admin invalid floorplan schema
    await WS_HANDLERS["floorplan_3d/save"](
        hass,
        admin_conn,
        {
            "id": 23,
            "type": "floorplan_3d/save",
            "floorplan": {"id": "bad", "name": "Bad", "floors": [], "unit": "feet"},
        },
    )
    assert admin_conn.errors[23][0] == "invalid_floorplan"


async def test_ws_delete(tmp_path: Path) -> None:
    """Test floorplan_3d/delete command handling admin auth and not_found."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()
    hass.data[DOMAIN] = {DATA_STORAGE_MANAGER: manager}

    admin_conn = MockConnection(is_admin=True)
    non_admin_conn = MockConnection(is_admin=False)

    # Non-admin rejected
    await WS_HANDLERS["floorplan_3d/delete"](
        hass, non_admin_conn, {"id": 30, "type": "floorplan_3d/delete", "floorplan_id": DEFAULT_FLOORPLAN_ID}
    )
    assert non_admin_conn.errors[30][0] == "unauthorized"

    # Admin deletes non-existent
    await WS_HANDLERS["floorplan_3d/delete"](
        hass, admin_conn, {"id": 31, "type": "floorplan_3d/delete", "floorplan_id": "ghost"}
    )
    assert admin_conn.errors[31][0] == "not_found"

    # Admin deletes existing
    await WS_HANDLERS["floorplan_3d/delete"](
        hass, admin_conn, {"id": 32, "type": "floorplan_3d/delete", "floorplan_id": DEFAULT_FLOORPLAN_ID}
    )
    assert admin_conn.results[32]["success"] is True


async def test_ws_upload_blueprint(tmp_path: Path) -> None:
    """Test floorplan_3d/upload_blueprint command."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    hass.data[DOMAIN] = {DATA_STORAGE_MANAGER: manager}

    admin_conn = MockConnection(is_admin=True)
    non_admin_conn = MockConnection(is_admin=False)

    raw = b"png-bytes"
    b64 = base64.b64encode(raw).decode("ascii")

    # Non-admin rejected
    await WS_HANDLERS["floorplan_3d/upload_blueprint"](
        hass,
        non_admin_conn,
        {
            "id": 40,
            "type": "floorplan_3d/upload_blueprint",
            "floorplan_id": "main",
            "floor_id": "gnd",
            "mime_type": "image/png",
            "data_base64": b64,
        },
    )
    assert non_admin_conn.errors[40][0] == "unauthorized"

    # Admin upload success
    await WS_HANDLERS["floorplan_3d/upload_blueprint"](
        hass,
        admin_conn,
        {
            "id": 41,
            "type": "floorplan_3d/upload_blueprint",
            "floorplan_id": "main",
            "floor_id": "gnd",
            "mime_type": "image/png",
            "data_base64": b64,
        },
    )
    assert 41 in admin_conn.results
    assert "/local/floorplan_3d/blueprints/" in admin_conn.results[41]["image_url"]

    # Admin invalid MIME
    await WS_HANDLERS["floorplan_3d/upload_blueprint"](
        hass,
        admin_conn,
        {
            "id": 42,
            "type": "floorplan_3d/upload_blueprint",
            "floorplan_id": "main",
            "floor_id": "gnd",
            "mime_type": "video/mp4",
            "data_base64": b64,
        },
    )
    assert admin_conn.errors[42][0] == "invalid_blueprint"


async def test_ws_subscribe_realtime_push(tmp_path: Path) -> None:
    """Test floorplan_3d/subscribe registers connection and pushes real-time updates."""
    hass = MockHass(tmp_path)
    manager = FloorplanStorageManager(hass, store=InMemoryStore())
    await manager.async_load()
    hass.data[DOMAIN] = {DATA_STORAGE_MANAGER: manager}

    conn = MockConnection(is_admin=False)
    sub_msg = {"id": 50, "type": "floorplan_3d/subscribe", "floorplan_id": DEFAULT_FLOORPLAN_ID}

    await WS_HANDLERS["floorplan_3d/subscribe"](hass, conn, sub_msg)
    assert 50 in conn.results
    assert 50 in conn.subscriptions

    # Save floorplan
    doc = manager.get_floorplan(DEFAULT_FLOORPLAN_ID)
    assert doc is not None
    await manager.async_save_floorplan(doc)

    assert len(conn.messages) == 1
    evt_msg = conn.messages[0]
    assert evt_msg["id"] == 50
    assert evt_msg["type"] == "event"
    assert evt_msg["event"]["event"] == "updated"

    # Connection unsubscription
    conn.subscriptions[50]()
    await manager.async_save_floorplan(doc)
    assert len(conn.messages) == 1


async def test_websocket_helpers() -> None:
    """Test event_message helper, schema dicts, and HA 2026.11 websocket_command compatibility."""
    import inspect

    msg = event_message(99, {"foo": "bar"})
    assert msg == {"id": 99, "type": "event", "event": {"foo": "bar"}}
    # Should run cleanly without throwing
    async_register_websocket_commands(None)

    # Verify all WS schemas are plain dicts (not vol.Schema instances) so HA 2026.11
    # websocket_command(schema) does not fail with AttributeError: 'Schema' object has no attribute 'validators'
    for expected_type, schema in (
        ("floorplan_3d/list", SCHEMA_WS_LIST),
        ("floorplan_3d/get", SCHEMA_WS_GET),
        ("floorplan_3d/save", SCHEMA_WS_SAVE),
        ("floorplan_3d/delete", SCHEMA_WS_DELETE),
        ("floorplan_3d/upload_blueprint", SCHEMA_WS_UPLOAD_BLUEPRINT),
        ("floorplan_3d/subscribe", SCHEMA_WS_SUBSCRIBE),
    ):
        assert isinstance(schema, dict)
        assert schema["type"] == expected_type

    # Simulate HA Core websocket_api.async_response + websocket_api.websocket_command
    for admin_only in (False, True):
        async def dummy_handler(hass: Any, connection: Any, msg: dict[str, Any]) -> None:
            pass

        decorated = _decorate_ws(SCHEMA_WS_SAVE, admin_only=admin_only)(dummy_handler)
        assert inspect.iscoroutinefunction(decorated)


# ---------------------------------------------------------------------------
# Integration Lifecycle & Config Flow Tests
# ---------------------------------------------------------------------------

async def test_config_flow() -> None:
    """Test Floorplan3DConfigFlow single-instance handling."""
    flow = Floorplan3DConfigFlow()

    # Step user: initial form
    result = await flow.async_step_user(None)
    assert result["type"] == "form"
    assert result["step_id"] == "user"

    # Step user: submit
    create_result = await flow.async_step_user({})
    assert create_result["type"] == "create_entry"
    assert create_result["title"] == "3D Floorplan Editor & Card"

    # Abort if entry already exists
    flow._async_current_entries = lambda: ["existing_entry"]  # type: ignore[assignment]
    abort_result = await flow.async_step_user(None)
    assert abort_result["type"] == "abort"
    assert abort_result["reason"] == "single_instance_allowed"


async def test_integration_lifecycle(tmp_path: Path) -> None:
    """Test async_setup, async_setup_entry, and async_unload_entry."""
    hass = MockHass(tmp_path)
    assert await async_setup(hass, {}) is True

    class MockConfigEntry:
        entry_id = "test_entry_id"

    entry = MockConfigEntry()

    # Setup entry
    success = await async_setup_entry(hass, entry)
    assert success is True
    assert DOMAIN in hass.data
    assert DATA_STORAGE_MANAGER in hass.data[DOMAIN]

    # Panel registered with content-hashed cache buster
    assert PANEL_URL_PATH in hass.frontend.panels
    panel_info = hass.frontend.panels[PANEL_URL_PATH]
    assert panel_info["component_name"] == "custom"
    assert panel_info["config"]["_panel_custom"]["name"] == PANEL_COMPONENT_NAME
    assert panel_info["require_admin"] is True
    panel_url = panel_info["config"]["module_url"]
    assert panel_url.startswith(f"{STATIC_URL_PATH}/{PANEL_BUNDLE_FILENAME}?v={VERSION}-")
    assert len(panel_url.split(f"?v={VERSION}-")[1]) == 10

    # Static path registered with cache_headers=False
    assert len(hass.http.static_paths) == 1
    assert hass.http.static_paths[0][2] is False

    # Lovelace card registered with content-hashed cache buster
    items = hass.data["lovelace"].resources.async_get_items()
    assert len(items) == 1
    card_url = items[0]["url"]
    assert card_url.startswith(f"{STATIC_URL_PATH}/{CARD_BUNDLE_FILENAME}?v={VERSION}-")
    assert len(card_url.split(f"?v={VERSION}-")[1]) == 10

    # Simulate stale cached Lovelace resource URL being automatically busted on reload
    await hass.data["lovelace"].resources.async_update_item(
        items[0]["id"],
        {"res_type": "module", "url": f"{STATIC_URL_PATH}/{CARD_BUNDLE_FILENAME}?v=0.1.0-stale00000"},
    )
    await async_setup_entry(hass, entry)
    refreshed_items = hass.data["lovelace"].resources.async_get_items()
    assert len(refreshed_items) == 1
    assert refreshed_items[0]["url"] == card_url

    # Unload entry
    unload_success = await async_unload_entry(hass, entry)
    assert unload_success is True
    assert DOMAIN not in hass.data
    assert PANEL_URL_PATH not in hass.frontend.panels
