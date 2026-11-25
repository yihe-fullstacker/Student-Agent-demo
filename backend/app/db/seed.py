from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import KnowledgePoint, Subject

INITIAL_SUBJECTS = [
    {
        "code": "politics",
        "name": "思想政治理论",
        "category": "公共课",
        "description": "考研政治（马原、毛中特、史纲、思修与时政）",
        "points": [
            ("马克思主义基本原理", "Intermediate", 5),
            ("毛泽东思想和中国特色社会主义理论体系概论", "Intermediate", 4),
            ("中国近现代史纲要", "Beginner", 4),
            ("思想道德与法治", "Beginner", 3),
            ("形势与政策及当代世界经济与政治", "Intermediate", 4),
        ],
    },
    {
        "code": "english1",
        "name": "英语（一）",
        "category": "公共课",
        "description": "学术型硕士研究生入学统一考试英语（一）",
        "points": [
            ("考研核心词汇与词根词缀", "Beginner", 5),
            ("长难句语法与结构拆解", "Intermediate", 5),
            ("阅读理解主旨与细节推理", "Advanced", 5),
            ("新题型与完形填空", "Intermediate", 3),
            ("英译汉与大小作文写作模板", "Intermediate", 4),
        ],
    },
    {
        "code": "english2",
        "name": "英语（二）",
        "category": "公共课",
        "description": "专业学位硕士研究生入学统一考试英语（二）",
        "points": [
            ("高频词汇与语境辨析", "Beginner", 5),
            ("长难句分析与段落逻辑", "Intermediate", 4),
            ("阅读理解解题技巧", "Intermediate", 5),
            ("英译汉段落翻译", "Intermediate", 4),
            ("应用文与图表作文写作", "Intermediate", 4),
        ],
    },
    {
        "code": "math1",
        "name": "数学（一）",
        "category": "公共课",
        "description": "考研数学一（高等数学、线性代数、概率论与数理统计）",
        "points": [
            ("函数极限与连续", "Beginner", 5),
            ("一元函数微积分及其应用", "Intermediate", 5),
            ("多元函数微积分与曲线曲面积分", "Advanced", 5),
            ("无穷级数与常微分方程", "Advanced", 4),
            ("线性代数矩阵特征值与二次型", "Intermediate", 5),
            ("随机变量分布与数理统计", "Intermediate", 4),
        ],
    },
    {
        "code": "math2",
        "name": "数学（二）",
        "category": "公共课",
        "description": "考研数学二（高等数学、线性代数）",
        "points": [
            ("极限计算与无穷小阶的比较", "Beginner", 5),
            ("导数应用与中值定理证明", "Advanced", 5),
            ("不定积分与定积分计算及应用", "Intermediate", 5),
            ("多元函数微分学与二重积分", "Intermediate", 5),
            ("常微分方程求解", "Intermediate", 4),
            ("线性方程组与矩阵相似对角化", "Intermediate", 4),
        ],
    },
    {
        "code": "math3",
        "name": "数学（三）",
        "category": "公共课",
        "description": "考研数学三（微积分、线性代数、概率论与数理统计）",
        "points": [
            ("微积分极限与导数经济应用", "Intermediate", 5),
            ("积分学与多元函数极值", "Intermediate", 5),
            ("无穷级数收敛判别与幂级数", "Intermediate", 4),
            ("行列式、矩阵与向量空间", "Intermediate", 4),
            ("随机事件概率与数字特征", "Intermediate", 5),
        ],
    },
    {
        "code": "cs408",
        "name": "计算机学科专业基础（408）",
        "category": "专业课",
        "description": "数据结构、计算机组成原理、操作系统、计算机网络",
        "points": [
            ("数据结构：线性表、树与图算法", "Intermediate", 5),
            ("数据结构：查找与内部排序算法", "Intermediate", 5),
            ("计算机组成原理：指令系统与CPU流水线", "Advanced", 5),
            ("计算机组成原理：存储层次与Cache映射", "Advanced", 4),
            ("操作系统：进程同步、死锁与虚拟内存", "Advanced", 5),
            ("计算机网络：TCP/IP协议栈与路由拥塞控制", "Intermediate", 5),
        ],
    },
]


def seed_initial_data(db: Session) -> None:
    """Idempotently populate standard kaoyan subjects and knowledge points."""
    existing_subjects = {
        s.code: s for s in db.scalars(select(Subject)).all()
    }

    for item in INITIAL_SUBJECTS:
        subject = existing_subjects.get(item["code"])
        if subject is None:
            subject = Subject(
                code=item["code"],
                name=item["name"],
                category=item["category"],
                description=item["description"],
            )
            db.add(subject)
            db.flush()

        existing_points = set(
            db.scalars(
                select(KnowledgePoint.name).where(KnowledgePoint.subject_id == subject.id)
            ).all()
        )
        for pt_name, difficulty, importance in item["points"]:
            if pt_name not in existing_points:
                db.add(
                    KnowledgePoint(
                        subject_id=subject.id,
                        name=pt_name,
                        difficulty=difficulty,
                        importance=importance,
                    )
                )

    db.commit()
