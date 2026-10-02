"""Base repository for standard CRUD operations."""

from typing import Generic, TypeVar, Type, Optional, List
from sqlmodel import Session, select

T = TypeVar("T")

class BaseRepository(Generic[T]):
    def __init__(self, model_class: Type[T], session: Session):
        self.model_class = model_class
        self.session = session

    def get_by_id(self, id_val: any) -> Optional[T]:
        return self.session.get(self.model_class, id_val)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        statement = select(self.model_class).offset(skip).limit(limit)
        return self.session.exec(statement).all()

    def create(self, entity: T) -> T:
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def update(self, entity: T) -> T:
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def delete(self, entity: T) -> None:
        self.session.delete(entity)
        self.session.commit()
