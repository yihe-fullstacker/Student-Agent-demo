from app.routers.auth import router as auth_router
from app.routers.exam import router as exam_router
from app.routers.plan import replan_router, router as plan_router
from app.routers.profile import router as profile_router
from app.routers.record import router as record_router
from app.routers.school import router as school_router
from app.routers.task import router as task_router

__all__ = [
    "auth_router",
    "exam_router",
    "plan_router",
    "profile_router",
    "record_router",
    "replan_router",
    "school_router",
    "task_router",
]
