from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Team, TeamMember, TeamAsset, Asset, Category
from app.api.auth import get_current_user

router = APIRouter(prefix="/teams", tags=["teams"])


class TeamCreate(BaseModel):
    name: str


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    admin_id: Optional[UUID] = None


class TeamMemberAdd(BaseModel):
    user_id: UUID
    role: str = "member"
    can_edit: bool = False


class TeamMemberUpdate(BaseModel):
    role: Optional[str] = None
    can_edit: Optional[bool] = None


class TeamResponse(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    admin_id: Optional[UUID]
    created_at: str

    class Config:
        from_attributes = True


class TeamMemberResponse(BaseModel):
    id: UUID
    team_id: UUID
    user_id: UUID
    role: str
    can_edit: bool
    joined_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=TeamResponse)
async def create_team(
    data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team = Team(
        name=data.name,
        owner_id=current_user.id,
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)

    # 自动添加创建者为 owner 成员
    member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="owner",
        can_edit=True,
    )
    db.add(member)
    await db.commit()

    return TeamResponse(
        id=team.id,
        name=team.name,
        owner_id=team.owner_id,
        admin_id=team.admin_id,
        created_at=team.created_at.isoformat() if team.created_at else "",
    )


@router.get("", response_model=List[TeamResponse])
async def list_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 获取用户所在的团队（包括创建的和管理员/成员）
    query = select(Team).join(
        TeamMember, Team.id == TeamMember.team_id
    ).where(TeamMember.user_id == current_user.id)

    result = await db.execute(query.order_by(Team.created_at.desc()))
    teams = result.scalars().all()

    return [
        TeamResponse(
            id=t.id,
            name=t.name,
            owner_id=t.owner_id,
            admin_id=t.admin_id,
            created_at=t.created_at.isoformat() if t.created_at else "",
        )
        for t in teams
    ]


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 检查用户是否属于该团队
    check_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id,
    )
    check_result = await db.execute(check_query)
    if not check_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="无权限访问该团队")

    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="团队不存在")

    return TeamResponse(
        id=team.id,
        name=team.name,
        owner_id=team.owner_id,
        admin_id=team.admin_id,
        created_at=team.created_at.isoformat() if team.created_at else "",
    )


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 检查用户是否属于该团队
    check_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id,
    )
    check_result = await db.execute(check_query)
    if not check_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="无权限访问该团队")

    result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id).order_by(TeamMember.joined_at)
    )
    members = result.scalars().all()

    return [
        TeamMemberResponse(
            id=m.id,
            team_id=m.team_id,
            user_id=m.user_id,
            role=m.role,
            can_edit=m.can_edit,
            joined_at=m.joined_at.isoformat() if m.joined_at else "",
        )
        for m in members
    ]


@router.post("/{team_id}/members", response_model=TeamMemberResponse)
async def add_team_member(
    team_id: UUID,
    data: TeamMemberAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 检查权限：仅 owner 或 admin 可添加成员
    check_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id,
        or_(TeamMember.role == "owner", TeamMember.role == "admin"),
    )
    check_result = await db.execute(check_query)
    if not check_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="无权限添加成员")

    # 检查成员是否已存在
    exist_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == data.user_id,
    )
    exist_result = await db.execute(exist_query)
    if exist_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该用户已是团队成员")

    member = TeamMember(
        team_id=team_id,
        user_id=data.user_id,
        role=data.role,
        can_edit=data.can_edit,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        user_id=member.user_id,
        role=member.role,
        can_edit=member.can_edit,
        joined_at=member.joined_at.isoformat() if member.joined_at else "",
    )


@router.patch("/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_team_member(
    team_id: UUID,
    user_id: UUID,
    data: TeamMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 检查权限：仅 owner 可修改成员权限
    check_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id,
        TeamMember.role == "owner",
    )
    check_result = await db.execute(check_query)
    if not check_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="无权限修改成员")

    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="成员不存在")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(member, key, value)

    await db.commit()
    await db.refresh(member)

    return TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        user_id=member.user_id,
        role=member.role,
        can_edit=member.can_edit,
        joined_at=member.joined_at.isoformat() if member.joined_at else "",
    )


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 检查权限：仅 owner 可移除成员
    check_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id,
        TeamMember.role == "owner",
    )
    check_result = await db.execute(check_query)
    if not check_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="无权限移除成员")

    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="成员不存在")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="不能移除团长")

    await db.delete(member)
    await db.commit()

    return {"message": "成员已移除"}


@router.delete("/{team_id}/leave")
async def leave_team(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """团长退出：将资产转移给 admin 或其他成员"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="团队不存在")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="仅团长可以退出")

    # 获取所有成员（不含 owner）
    members_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id != current_user.id,
    )
    members_result = await db.execute(members_query)
    other_members = members_result.scalars().all()

    if not other_members:
        # 没有其他成员，删除团队
        await db.delete(team)
        await db.commit()
        return {"message": "团队已解散（无其他成员）", "action": "deleted"}

    # 优先转移给 admin
    new_owner_id = team.admin_id if team.admin_id and team.admin_id != current_user.id else None

    if not new_owner_id:
        # 转移给第一个其他成员
        new_owner_id = other_members[0].user_id

    # 更新 owner_id
    team.owner_id = new_owner_id
    # 更新 admin_id
    if team.admin_id == current_user.id:
        team.admin_id = new_owner_id

    # 将新 owner 角色改为 owner
    new_owner_query = select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == new_owner_id,
    )
    new_owner_result = await db.execute(new_owner_query)
    new_owner_member = new_owner_result.scalar_one_or_none()
    if new_owner_member:
        new_owner_member.role = "owner"

    await db.commit()

    return {"message": "已退出团队，资产转移给新团长", "new_owner_id": str(new_owner_id)}


@router.delete("/{team_id}")
async def delete_team(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """仅 owner 可删除团队"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="团队不存在")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="仅团长可以删除团队")

    await db.delete(team)
    await db.commit()

    return {"message": "团队已删除"}