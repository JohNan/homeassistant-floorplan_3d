"""Config flow for 3D Floorplan Editor & Card."""

from __future__ import annotations

from typing import Any

try:
    from homeassistant import config_entries
    from homeassistant.data_entry_flow import FlowResult
except ImportError:
    # Standalone fallback for testing environments without homeassistant installed
    class _MockConfigEntries:
        class ConfigFlow:
            """Mock ConfigFlow."""

            def __init_subclass__(cls, domain: str | None = None, **kwargs: Any) -> None:
                super().__init_subclass__(**kwargs)
                cls.domain = domain

            def _async_current_entries(self) -> list[Any]:
                return []

            def async_abort(self, *, reason: str) -> dict[str, Any]:
                return {"type": "abort", "reason": reason}

            def async_show_form(
                self, *, step_id: str, data_schema: Any = None, errors: Any = None
            ) -> dict[str, Any]:
                return {
                    "type": "form",
                    "step_id": step_id,
                    "data_schema": data_schema,
                    "errors": errors,
                }

            def async_create_entry(
                self, *, title: str, data: dict[str, Any]
            ) -> dict[str, Any]:
                return {"type": "create_entry", "title": title, "data": data}

    config_entries = _MockConfigEntries()  # type: ignore[assignment]
    FlowResult = dict[str, Any]  # type: ignore[misc, assignment]

from .const import DOMAIN


class Floorplan3DConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for 3D Floorplan Editor & Card."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="Floorplan 3D", data={})

        return self.async_show_form(step_id="user")
