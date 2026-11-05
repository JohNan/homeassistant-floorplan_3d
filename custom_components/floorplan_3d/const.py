"""Constants for the 3D Floorplan Editor & Card integration."""

from __future__ import annotations

DOMAIN = "floorplan_3d"
VERSION = "0.2.0"

STORAGE_VERSION = 1
STORAGE_KEY = "floorplan_3d.floorplans"

STATIC_URL_PATH = "/floorplan_3d_static"
PANEL_URL_PATH = "floorplan-3d"
PANEL_COMPONENT_NAME = "floorplan-editor-panel"
PANEL_TITLE = "Floorplan 3D"
PANEL_ICON = "mdi:floor-plan"

CARD_BUNDLE_FILENAME = "floorplan-card.js"
PANEL_BUNDLE_FILENAME = "floorplan-panel.js"

MAX_BLUEPRINT_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_BLUEPRINT_MIMES: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}

DATA_STORAGE_MANAGER = "storage_manager"
DEFAULT_FLOORPLAN_ID = "main_house"
DEFAULT_FLOORPLAN_NAME = "Main House"
