export enum UserStatus {
    Disabled = 0,
    Active = 1,
    Locked = 2
}

export interface User {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    status: UserStatus
    token: string
}

export interface UserDto {
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface InsertUserDto extends UserDto {
    password?: string;
}

export interface UpdateUserDto extends UserDto {
    id: number;
    status: UserStatus;
}

export interface SelectUserDto
{
    user: string;
    password: string;
    permanent?: boolean;
}