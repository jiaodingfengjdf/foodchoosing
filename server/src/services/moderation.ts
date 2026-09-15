/**
 * 内容安全钩子。MVP 阶段为 no-op；接入第三方鉴黄/敏感词服务时在此同步拦截，
 * 并抛 `new HttpError(422, "CONTENT_BLOCKED", "图片或内容包含违规信息，请重新上传")`。
 */
export function moderateCheckin(review: string | undefined, photoPath: string | undefined): void {
  void review;
  void photoPath;
}
