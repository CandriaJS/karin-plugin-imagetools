export interface AvatarInfoType {
  /** 用户id */
  userId: string
  /** 头像 */
  avatar: string
}

export interface ImageInfoType {
  /** 用户id */
  userId: string
  /** 图片 */
  image: string | Buffer
}
