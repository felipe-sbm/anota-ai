# inicia o servidor sem precisar colocar aquele comando feio

#!/usr/bin/env python3

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        reload=True,
        reload_dirs=["app"],
        reload_excludes=[".venv/*", "__pycache__/*"],
    )