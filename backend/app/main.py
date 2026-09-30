from datetime import datetime, timedelta, timezone

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    Query,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from jose import JWTError
from tinydb import Query as TinyQuery


from app.db import (
    incidents,
    reset_tokens,
    users,
)

from app.email_service import send_password_reset_email
from app.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    ProfileUpdate,
    ResetPasswordRequest,
    UserCreate,
    UserPublic,
    IncidentCreate,
    IncidentPublic,
    IncidentStatusUpdate,
    IncidentSummary,
)
from app.security import (
    create_access_token,
    create_reset_token,
    decode_access_token,
    hash_password,
    hash_reset_token,
    verify_password,
)

from fastapi.exceptions import (
    RequestValidationError,
)

from fastapi.responses import (
    JSONResponse,
)

from app.incident_rules import (
    VALID_BRANCHES,
    VALID_CATEGORIES,
    VALID_ORIGINS,
    VALID_STATUSES,
    validate_incident_data,
    validate_status_transition,
)

app = FastAPI(
    title="Auth Full Stack API",
)

@app.exception_handler(
    RequestValidationError
)
async def request_validation_handler(
    request: Request,
    exc: RequestValidationError,
):
    first_error = exc.errors()[0]

    location = first_error.get(
        "loc",
        [],
    )

    field = (
        str(location[-1])
        if location
        else "unknown"
    )

    return JSONResponse(
        status_code=400,
        content={
            "error": "validation_error",
            "field": field,
            "message": (
                first_error.get(
                    "msg",
                    "Dato inválido",
                )
            ),
        },
    )

@app.exception_handler(Exception)
async def unexpected_error_handler(
    request: Request,
    exc: Exception,
):
    print(
        "ERROR INTERNO:",
        repr(exc),
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": (
                "Ocurrió un error inesperado."
            ),
        },
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


bearer = HTTPBearer(
    auto_error=False,
)

UserQuery = TinyQuery()
ResetQuery = TinyQuery()
IncidentQuery = TinyQuery()


def public_user(user) -> dict:
    return {
        "id": user.doc_id,
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "address": user.get("address", ""),
    }

def public_incident(
    incident,
) -> dict:
    return {
        "id": incident.doc_id,
        "title": incident["title"],
        "description": incident[
            "description"
        ],
        "category": incident[
            "category"
        ],
        "status": incident["status"],
        "origin": incident["origin"],
        "branch": incident["branch"],
        "reported_by_user_id": (
            incident.get(
                "reported_by_user_id"
            )
        ),
        "legacy_id": incident.get(
            "legacy_id"
        ),
        "created_at": incident[
            "created_at"
        ],
        "updated_at": incident[
            "updated_at"
        ],
    }

def validation_error(
    *,
    field: str,
    message: str,
) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={
            "error": "validation_error",
            "field": field,
            "message": message,
        },
    )

def find_user_by_email(email: str):
    results = users.search(
        UserQuery.email == email.lower()
    )

    if not results:
        return None

    return results[0]


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer
    ),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado.",
        )

    try:
        payload = decode_access_token(
            credentials.credentials
        )

        user_id = int(payload["sub"])

    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
        )

    user = users.get(
        doc_id=user_id
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
        )

    return user


@app.get("/")
def root():
    return {
        "message": "API funcionando"
    }


@app.post(
    "/auth/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserCreate,
):
    existing_user = find_user_by_email(
        payload.email
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado.",
        )

    user_id = users.insert(
        {
            "email": payload.email.lower(),
            "password_hash": hash_password(
                payload.password
            ),
            "name": payload.name,
            "phone": payload.phone,
            "address": payload.address,
        }
    )

    user = users.get(
        doc_id=user_id
    )

    return public_user(user)


@app.post(
    "/auth/login",
    response_model=LoginResponse,
)
def login(
    payload: LoginRequest,
):
    user = find_user_by_email(
        payload.email
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
        )

    if not verify_password(
        payload.password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
        )

    access_token = create_access_token(
        user_id=user.doc_id,
        email=user["email"],
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": public_user(user),
    }


@app.get(
    "/auth/me",
    response_model=UserPublic,
)
def me(
    current_user=Depends(
        get_current_user
    ),
):
    return public_user(
        current_user
    )


@app.put(
    "/profiles/me",
    response_model=UserPublic,
)
def update_profile(
    payload: ProfileUpdate,
    current_user=Depends(
        get_current_user
    ),
):
    changes = payload.model_dump(
        exclude_none=True
    )

    users.update(
        changes,
        doc_ids=[current_user.doc_id],
    )

    updated_user = users.get(
        doc_id=current_user.doc_id
    )

    return public_user(
        updated_user
    )


@app.post(
    "/auth/change-password",
    response_model=MessageResponse,
)
def change_password(
    payload: ChangePasswordRequest,
    current_user=Depends(
        get_current_user
    ),
):
    if not verify_password(
        payload.current_password,
        current_user["password_hash"],
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta.",
        )

    users.update(
        {
            "password_hash": hash_password(
                payload.new_password
            )
        },
        doc_ids=[current_user.doc_id],
    )

    return {
        "message": "Contraseña actualizada correctamente."
    }


@app.post(
    "/auth/forgot-password",
    response_model=MessageResponse,
)
def forgot_password(
    payload: ForgotPasswordRequest,
):
    generic_message = (
        "Si esa dirección está registrada, "
        "recibirás un enlace en breve."
    )

    user = find_user_by_email(
        payload.email
    )

    if not user:
        return {
            "message": generic_message
        }

    now = datetime.now(
        timezone.utc
    )

    previous_tokens = reset_tokens.search(
        (ResetQuery.user_id == user.doc_id)
        & (ResetQuery.used == False)
    )

    for previous_token in previous_tokens:
        reset_tokens.update(
            {
                "used": True
            },
            doc_ids=[previous_token.doc_id],
        )

    raw_token = create_reset_token()

    reset_tokens.insert(
        {
            "user_id": user.doc_id,
            "token_hash": hash_reset_token(
                raw_token
            ),
            "expires_at": (
                now + timedelta(minutes=30)
            ).isoformat(),
            "used": False,
        }
    )

    try:
        send_password_reset_email(
            to_email=user["email"],
            token=raw_token,
        )

    except Exception as error:
        print(
            "Error enviando email:",
            error,
        )

    return {
        "message": generic_message
    }


@app.post(
    "/auth/reset-password",
    response_model=MessageResponse,
)
def reset_password(
    payload: ResetPasswordRequest,
):
    token_hash = hash_reset_token(
        payload.token
    )

    matches = reset_tokens.search(
        ResetQuery.token_hash == token_hash
    )

    if not matches:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido.",
        )

    reset_token = matches[0]

    if reset_token.get("used") is True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token ya fue utilizado.",
        )

    expires_at = datetime.fromisoformat(
        reset_token["expires_at"]
    )

    now = datetime.now(
        timezone.utc
    )

    if expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token expiró.",
        )

    user = users.get(
        doc_id=reset_token["user_id"]
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido.",
        )

    users.update(
        {
            "password_hash": hash_password(
                payload.new_password
            )
        },
        doc_ids=[user.doc_id],
    )

    reset_tokens.update(
        {
            "used": True
        },
        doc_ids=[reset_token.doc_id],
    )

    other_tokens = reset_tokens.search(
        (ResetQuery.user_id == user.doc_id)
        & (ResetQuery.used == False)
    )

    for token in other_tokens:
        reset_tokens.update(
            {
                "used": True
            },
            doc_ids=[token.doc_id],
        )

    return {
        "message": "Contraseña actualizada correctamente."
    }

@app.post(
    "/api/incidents",
    response_model=IncidentPublic,
    status_code=201,
)
def create_incident(
    payload: IncidentCreate,
    current_user=Depends(
        get_current_user
    ),
):
    try:
        clean_data = (
            validate_incident_data(
                title=payload.title,
                description=(
                    payload.description
                ),
                category=payload.category,
                status=payload.status,
                origin=payload.origin,
                branch=payload.branch,
            )
        )

    except ValueError as error:
        message = str(error)

        field = "unknown"

        for candidate in [
            "title",
            "description",
            "category",
            "status",
            "origin",
            "branch",
        ]:
            if candidate in message:
                field = candidate
                break

        raise validation_error(
            field=field,
            message=message,
        )

    now = datetime.now(
        timezone.utc
    ).isoformat()

    incident_id = incidents.insert(
        {
            **clean_data,
            "reported_by_user_id": (
                current_user.doc_id
            ),
            "legacy_id": None,
            "created_at": now,
            "updated_at": now,
        }
    )

    created = incidents.get(
        doc_id=incident_id
    )

    return public_incident(
        created
    )

@app.get(
    "/api/incidents",
    response_model=list[IncidentPublic],
)
def list_incidents(
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    origin: str | None = None,
    branch: str | None = None,
    category: str | None = None,
    current_user=Depends(
        get_current_user
    ),
):
    records = incidents.all()

    if status_filter:
        records = [
            item
            for item in records
            if item["status"]
            == status_filter
        ]

    if origin:
        records = [
            item
            for item in records
            if item["origin"]
            == origin
        ]

    if branch:
        records = [
            item
            for item in records
            if item["branch"]
            == branch
        ]

    if category:
        records = [
            item
            for item in records
            if item["category"]
            == category
        ]

    return [
        public_incident(item)
        for item in records
    ]



@app.get(
    "/api/incidents/summary",
    response_model=IncidentSummary,
)
def incidents_summary(
    current_user=Depends(
        get_current_user
    ),
):
    records = incidents.all()

    by_status = {}
    by_category = {}
    by_origin = {}
    by_branch = {}

    for item in records:
        incident_status = item[
            "status"
        ]
        category = item["category"]
        origin = item["origin"]
        branch = item["branch"]

        by_status[
            incident_status
        ] = (
            by_status.get(
                incident_status,
                0,
            )
            + 1
        )

        by_category[
            category
        ] = (
            by_category.get(
                category,
                0,
            )
            + 1
        )

        by_origin[
            origin
        ] = (
            by_origin.get(
                origin,
                0,
            )
            + 1
        )

        by_branch[
            branch
        ] = (
            by_branch.get(
                branch,
                0,
            )
            + 1
        )

    return {
        "total": len(records),
        "by_status": by_status,
        "by_category": by_category,
        "by_origin": by_origin,
        "by_branch": by_branch,
    }

@app.get(
    "/api/incidents/{incident_id}",
    response_model=IncidentPublic,
)
def get_incident(
    incident_id: int,
    current_user=Depends(
        get_current_user
    ),
):
    incident = incidents.get(
        doc_id=incident_id
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "message": (
                    "Incidencia no encontrada"
                ),
            },
        )

    return public_incident(
        incident
    )

@app.patch(
    "/api/incidents/{incident_id}/status",
    response_model=IncidentPublic,
)
def update_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
    current_user=Depends(
        get_current_user
    ),
):
    incident = incidents.get(
        doc_id=incident_id
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "message": (
                    "Incidencia no encontrada"
                ),
            },
        )

    try:
        validate_status_transition(
            current_status=incident[
                "status"
            ],
            new_status=payload.status,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail={
                "error": (
                    "invalid_status_transition"
                ),
                "field": "status",
                "message": str(error),
            },
        )

    incidents.update(
        {
            "status": payload.status,
            "updated_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
        },
        doc_ids=[incident_id],
    )

    updated = incidents.get(
        doc_id=incident_id
    )

    return public_incident(
        updated
    )