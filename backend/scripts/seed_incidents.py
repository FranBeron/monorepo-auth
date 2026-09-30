import csv
from datetime import datetime, timezone
from pathlib import Path

from tinydb import Query

from app.db import incidents
from app.incident_rules import (
    validate_incident_data,
)


BASE_DIR = Path(__file__).resolve().parent.parent

CSV_PATH = (
    BASE_DIR
    / "data"
    / "incidents_history.csv"
)


STATUS_MAP = {
    "abierta": "open",
    "en_progreso": "in_progress",
    "resuelta": "resolved",
    "descartada": "discarded",
}


CATEGORY_MAP = {
    "pago": "pagos",
    "sistema": "sistema",
    "pedido": "pedidos",
    "atencion": "atencion_cliente",
    "infraestructura": "infraestructura",
}


BRANCH_MAP = {
    "Central": "central",
    "Sucursal Norte": "sucursal_norte",
    "Sucursal Centro": "sucursal_centro",
    "Sucursal Sur": "sucursal_sur",
}


IncidentQuery = Query()


def create_title(
    description: str,
) -> str:
    clean_description = description.strip()

    if len(clean_description) <= 70:
        return clean_description

    return (
        clean_description[:67]
        + "..."
    )


def transform_row(
    row: dict,
) -> dict:
    description = row[
        "description"
    ].strip()

    status = STATUS_MAP.get(
        row["estado"].strip()
    )

    category = CATEGORY_MAP.get(
        row["categoria"].strip()
    )

    branch = BRANCH_MAP.get(
        row["ubicacion"].strip()
    )

    if status is None:
        raise ValueError(
            "Estado histórico desconocido"
        )

    if category is None:
        raise ValueError(
            "Categoría histórica desconocida"
        )

    if branch is None:
        raise ValueError(
            "Sucursal histórica desconocida"
        )

    created_at = datetime.fromisoformat(
        row["date"].strip()
    )

    if created_at.tzinfo is None:
        created_at = created_at.replace(
            tzinfo=timezone.utc
        )

    validated = validate_incident_data(
        title=create_title(
            description
        ),
        description=description,
        category=category,
        status=status,
        origin="customer",
        branch=branch,
    )

    return {
        **validated,
        "legacy_id": row[
            "legacy_id"
        ].strip(),
        "reported_by_user_id": None,
        "created_at": (
            created_at.isoformat()
        ),
        "updated_at": (
            created_at.isoformat()
        ),
    }


def main():
    inserted = 0
    skipped = 0
    invalid_rows = []

    with CSV_PATH.open(
        "r",
        encoding="utf-8",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        for line_number, row in enumerate(
            reader,
            start=2,
        ):
            try:
                legacy_id = row[
                    "legacy_id"
                ].strip()

                existing = incidents.search(
                    IncidentQuery.legacy_id
                    == legacy_id
                )

                if existing:
                    skipped += 1
                    continue

                incident = transform_row(
                    row
                )

                incidents.insert(
                    incident
                )

                inserted += 1

            except Exception as error:
                invalid_rows.append(
                    {
                        "line": line_number,
                        "error": str(error),
                    }
                )

    print()
    print("Seed terminado")
    print("----------------")
    print(
        f"Insertadas: {inserted}"
    )
    print(
        f"Omitidas: {skipped}"
    )
    print(
        f"Inválidas: {len(invalid_rows)}"
    )

    if invalid_rows:
        print()
        print("Filas inválidas:")

        for item in invalid_rows:
            print(
                (
                    f'Fila {item["line"]}: '
                    f'{item["error"]}'
                )
            )


if __name__ == "__main__":
    main()