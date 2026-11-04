"""3D Floorplan Editor & Card integration for Home Assistant."""

from __future__ import annotations

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


async def _async_register_static_paths(hass: Any) -> None:
    """Register static path for pre-compiled frontend bundles."""
    dist_path = Path(__file__).parent / "frontend" / "dist"
    if not dist_path.exists():
        dist_path.mkdir(parents=True, exist_ok=True)

    http = getattr(hass, "http", None)
    if http is None:
        return

    if hasattr(http, "async_register_static_paths"):
        try:
            from homeassistant.components.http import StaticPathConfig

            await http.async_register_static_paths(
                [StaticPathConfig(STATIC_URL_PATH, str(dist_path), cache_headers=True)]
            )
            return
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not async_register_static_paths: %s", exc)

    if hasattr(http, "register_static_path"):
        try:
            http.register_static_path(
                STATIC_URL_PATH, str(dist_path), cache_headers=True
            )
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not register_static_path: %s", exc)


async def _async_register_panel(hass: Any) -> None:
    """Register admin-only 2D/3D editor sidebar panel."""
    panel_module_url = f"{STATIC_URL_PATH}/{PANEL_BUNDLE_FILENAME}?v={VERSION}"

    try:
        from homeassistant.components import frontend

        if hasattr(frontend, "async_register_built_in_panel"):
            res = frontend.async_register_built_in_panel(
                hass,
                component_name=PANEL_COMPONENT_NAME,
                sidebar_title=PANEL_TITLE,
                sidebar_icon=PANEL_ICON,
                frontend_url_path=PANEL_URL_PATH,
                require_admin=True,
                config={"module_url": panel_module_url},
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
                    component_name=PANEL_COMPONENT_NAME,
                    sidebar_title=PANEL_TITLE,
                    sidebar_icon=PANEL_ICON,
                    frontend_url_path=PANEL_URL_PATH,
                    require_admin=True,
                    config={"module_url": panel_module_url},
                    update=True,
                )
            except TypeError:
                res = func(
                    component_name=PANEL_COMPONENT_NAME,
                    sidebar_title=PANEL_TITLE,
                    sidebar_icon=PANEL_ICON,
                    frontend_url_path=PANEL_URL_PATH,
                    require_admin=True,
                    config={"module_url": panel_module_url},
                    update=True,
                )
            if hasattr(res, "__await__"):
                await res
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Could not register panel via frontend component: %s", exc)


async def _async_register_lovelace_card(hass: Any) -> None:
    """Auto-register Lovelace card resource in storage mode if available."""
    card_url = f"{STATIC_URL_PATH}/{CARD_BUNDLE_FILENAME}?v={VERSION}"
    lovelace = hass.data.get("lovelace")
    if not lovelace:
        return

    resources = getattr(lovelace, "resources", None)
    if not resources or not hasattr(resources, "async_get_items"):
        return

    try:
        items = resources.async_get_items()
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
