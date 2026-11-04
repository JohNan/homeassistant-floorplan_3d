"""WebSocket API endpoints for 3D Floorplan Editor & Card."""

from __future__ import annotations

import functools
from collections.abc import Callable
from typing import Any

from .const import DATA_STORAGE_MANAGER, DOMAIN
from .storage import FloorplanStorageManager, RevisionConflictError, ValidationError

try:
    import voluptuous as vol
    from homeassistant.components import websocket_api
    HAVE_HA = True
except ImportError:
    HAVE_HA = False
    websocket_api = None  # type: ignore[assignment]
    vol = None  # type: ignore[assignment]


def require_admin(func: Callable[..., Any]) -> Callable[..., Any]:
    """Require admin privileges for WebSocket command."""

    @functools.wraps(func)
    async def wrapper(hass: Any, connection: Any, msg: dict[str, Any]) -> Any:
        user = getattr(connection, "user", None)
        if user is not None and not getattr(user, "is_admin", False):
            connection.send_error(msg["id"], "unauthorized", "Unauthorized")
            return None
        return await func(hass, connection, msg)

    wrapper._require_admin = True  # type: ignore[attr-defined]
    return wrapper


def event_message(msg_id: int, event: Any) -> dict[str, Any]:
    """Format WebSocket event message."""
    if HAVE_HA and hasattr(websocket_api, "event_message"):
        return websocket_api.event_message(msg_id, event)
    return {"id": msg_id, "type": "event", "event": event}


# Schema definitions
if HAVE_HA and vol is not None and hasattr(websocket_api, "BASE_COMMAND_MESSAGE_SCHEMA"):
    SCHEMA_WS_LIST = websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
        {
            vol.Required("type"): "floorplan_3d/list",
        }
    )
    SCHEMA_WS_GET = websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
        {
            vol.Required("type"): "floorplan_3d/get",
            vol.Required("floorplan_id"): str,
        }
    )
    SCHEMA_WS_SAVE = websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
        {
            vol.Required("type"): "floorplan_3d/save",
            vol.Required("floorplan"): dict,
            vol.Optional("expected_revision"): vol.Any(int, None),
        }
    )
    SCHEMA_WS_DELETE = websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
        {
            vol.Required("type"): "floorplan_3d/delete",
            vol.Required("floorplan_id"): str,
        }
    )
    SCHEMA_WS_UPLOAD_BLUEPRINT = websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
        {
            vol.Required("type"): "floorplan_3d/upload_blueprint",
            vol.Required("floorplan_id"): str,
            vol.Required("floor_id"): str,
            vol.Required("mime_type"): str,
            vol.Required("data_base64"): str,
        }
    )
    SCHEMA_WS_SUBSCRIBE = websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
        {
            vol.Required("type"): "floorplan_3d/subscribe",
            vol.Optional("floorplan_id"): str,
        }
    )
else:
    SCHEMA_WS_LIST = {"type": "floorplan_3d/list"}
    SCHEMA_WS_GET = {"type": "floorplan_3d/get", "floorplan_id": str}
    SCHEMA_WS_SAVE = {"type": "floorplan_3d/save", "floorplan": dict}
    SCHEMA_WS_DELETE = {"type": "floorplan_3d/delete", "floorplan_id": str}
    SCHEMA_WS_UPLOAD_BLUEPRINT = {"type": "floorplan_3d/upload_blueprint"}
    SCHEMA_WS_SUBSCRIBE = {"type": "floorplan_3d/subscribe"}


def _decorate_ws(schema: Any) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorate function with websocket_command and async_response."""

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        if HAVE_HA and hasattr(websocket_api, "websocket_command"):
            func = websocket_api.async_response(func)
            func = websocket_api.websocket_command(schema)(func)
        return func

    return decorator


@_decorate_ws(SCHEMA_WS_LIST)
async def ws_list(hass: Any, connection: Any, msg: dict[str, Any]) -> None:
    """Handle floorplan_3d/list command."""
    manager: FloorplanStorageManager = hass.data[DOMAIN][DATA_STORAGE_MANAGER]
    summaries = manager.list_floorplans()
    connection.send_result(msg["id"], summaries)


@_decorate_ws(SCHEMA_WS_GET)
async def ws_get(hass: Any, connection: Any, msg: dict[str, Any]) -> None:
    """Handle floorplan_3d/get command."""
    manager: FloorplanStorageManager = hass.data[DOMAIN][DATA_STORAGE_MANAGER]
    fp_id = msg.get("floorplan_id", "")
    fp = manager.get_floorplan(fp_id)
    if fp is None:
        connection.send_error(msg["id"], "not_found", f"Floorplan '{fp_id}' not found")
        return
    connection.send_result(msg["id"], fp)


@require_admin
@_decorate_ws(SCHEMA_WS_SAVE)
async def ws_save(hass: Any, connection: Any, msg: dict[str, Any]) -> None:
    """Handle floorplan_3d/save command (Admin Only)."""
    manager: FloorplanStorageManager = hass.data[DOMAIN][DATA_STORAGE_MANAGER]
    expected_rev = msg.get("expected_revision")
    try:
        saved = await manager.async_save_floorplan(
            msg["floorplan"], expected_revision=expected_rev
        )
    except RevisionConflictError as err:
        connection.send_error(msg["id"], "revision_conflict", str(err))
        return
    except ValidationError as err:
        connection.send_error(msg["id"], "invalid_floorplan", str(err))
        return
    connection.send_result(msg["id"], saved)


@require_admin
@_decorate_ws(SCHEMA_WS_DELETE)
async def ws_delete(hass: Any, connection: Any, msg: dict[str, Any]) -> None:
    """Handle floorplan_3d/delete command (Admin Only)."""
    manager: FloorplanStorageManager = hass.data[DOMAIN][DATA_STORAGE_MANAGER]
    fp_id = msg.get("floorplan_id", "")
    success = await manager.async_delete_floorplan(fp_id)
    if not success:
        connection.send_error(msg["id"], "not_found", f"Floorplan '{fp_id}' not found")
        return
    connection.send_result(msg["id"], {"success": True})


@require_admin
@_decorate_ws(SCHEMA_WS_UPLOAD_BLUEPRINT)
async def ws_upload_blueprint(
    hass: Any, connection: Any, msg: dict[str, Any]
) -> None:
    """Handle floorplan_3d/upload_blueprint command (Admin Only)."""
    manager: FloorplanStorageManager = hass.data[DOMAIN][DATA_STORAGE_MANAGER]
    try:
        url = await manager.async_save_blueprint(
            floorplan_id=msg["floorplan_id"],
            floor_id=msg["floor_id"],
            mime_type=msg["mime_type"],
            data_base64=msg["data_base64"],
        )
    except ValidationError as err:
        connection.send_error(msg["id"], "invalid_blueprint", str(err))
        return
    connection.send_result(msg["id"], {"image_url": url})


@_decorate_ws(SCHEMA_WS_SUBSCRIBE)
async def ws_subscribe(hass: Any, connection: Any, msg: dict[str, Any]) -> None:
    """Handle floorplan_3d/subscribe command (All Authenticated Users)."""
    manager: FloorplanStorageManager = hass.data[DOMAIN][DATA_STORAGE_MANAGER]
    msg_id = msg["id"]
    target_fp_id = msg.get("floorplan_id")

    def _forward_event(event: dict[str, Any]) -> None:
        connection.send_message(event_message(msg_id, event))

    unsub = manager.subscribe(target_fp_id, _forward_event)
    if hasattr(connection, "subscriptions"):
        connection.subscriptions[msg_id] = unsub
    connection.send_result(msg_id)


WS_HANDLERS: dict[str, Callable[..., Any]] = {
    "floorplan_3d/list": ws_list,
    "floorplan_3d/get": ws_get,
    "floorplan_3d/save": ws_save,
    "floorplan_3d/delete": ws_delete,
    "floorplan_3d/upload_blueprint": ws_upload_blueprint,
    "floorplan_3d/subscribe": ws_subscribe,
}


def async_register_websocket_commands(hass: Any) -> None:
    """Register all floorplan_3d WebSocket commands with Home Assistant."""
    if HAVE_HA and hasattr(websocket_api, "async_register_command"):
        for handler in (
            ws_list,
            ws_get,
            ws_save,
            ws_delete,
            ws_upload_blueprint,
            ws_subscribe,
        ):
            websocket_api.async_register_command(hass, handler)
