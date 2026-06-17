"""HORIZON — FastAPI server entry point.

Run locally:
    cd horizon
    uvicorn src.server:app --reload --port 8088

Or via Docker:
    docker build -t horizon . && docker run -p 8088:8088 horizon

The static frontend (index.html + client.js) lives at the HORIZON root
so it can also be served directly by Vercel at /horizon/ without this
server running. We only mount specific files here — we do NOT expose
the whole HORIZON_ROOT as static files.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import HORIZON_ROOT, settings
from .db import init_db
from .routes.api import router as api_router


# Whitelist of frontend assets the server is allowed to serve.
_FRONTEND_ASSETS: set[str] = {"index.html", "client.js"}


def create_app() -> FastAPI:
    init_db()
    app = FastAPI(
        title=f"{settings.product_name} — MANIFEST module",
        version=settings.version,
        docs_url="/api/horizon/docs",
        openapi_url="/api/horizon/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins) or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.proxy_route_base)

    index_path: Path = HORIZON_ROOT / "index.html"

    @app.get("/horizon", include_in_schema=False)
    @app.get("/horizon/", include_in_schema=False)
    def horizon_index() -> FileResponse:
        if not index_path.exists():
            raise HTTPException(status_code=404, detail="frontend_missing")
        return FileResponse(str(index_path))

    @app.get("/horizon/{asset}", include_in_schema=False)
    def horizon_asset(asset: str) -> FileResponse:
        if asset not in _FRONTEND_ASSETS:
            raise HTTPException(status_code=404, detail="asset_not_allowed")
        fp = HORIZON_ROOT / asset
        if not fp.exists():
            raise HTTPException(status_code=404, detail="asset_missing")
        return FileResponse(str(fp))

    return app


app = create_app()


if __name__ == "__main__":  # pragma: no cover
    import uvicorn
    uvicorn.run(
        "src.server:app",
        host=settings.host,
        port=settings.port,
        reload=(settings.mode != "prod"),
    )
