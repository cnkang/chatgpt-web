const commonLabelKeys = [
  'workspaceAccess',
  'accessToken',
  'enterWorkspaceToken',
  'openSidebar',
  'closeSidebar',
  'saveChatTitle',
  'editChatTitle',
  'deleteChat',
] as const

type CommonLabelKey = (typeof commonLabelKeys)[number]
const LABEL_SEPARATOR = '\u0001'

const commonLabelsByLocale = {
  'en-US': `Workspace Access${LABEL_SEPARATOR}Access token${LABEL_SEPARATOR}Enter the workspace token${LABEL_SEPARATOR}Open sidebar${LABEL_SEPARATOR}Close sidebar${LABEL_SEPARATOR}Save chat title${LABEL_SEPARATOR}Edit chat title${LABEL_SEPARATOR}Delete chat`,
  'es-ES': `Acceso al espacio de trabajo${LABEL_SEPARATOR}Token de acceso${LABEL_SEPARATOR}Introduce el token del espacio de trabajo${LABEL_SEPARATOR}Abrir barra lateral${LABEL_SEPARATOR}Cerrar barra lateral${LABEL_SEPARATOR}Guardar título del chat${LABEL_SEPARATOR}Editar título del chat${LABEL_SEPARATOR}Eliminar chat`,
  'ko-KR': `워크스페이스 접근${LABEL_SEPARATOR}액세스 토큰${LABEL_SEPARATOR}워크스페이스 토큰을 입력하세요${LABEL_SEPARATOR}사이드바 열기${LABEL_SEPARATOR}사이드바 닫기${LABEL_SEPARATOR}채팅 제목 저장${LABEL_SEPARATOR}채팅 제목 편집${LABEL_SEPARATOR}채팅 삭제`,
  'ru-RU': `Доступ к рабочему пространству${LABEL_SEPARATOR}Токен доступа${LABEL_SEPARATOR}Введите токен рабочего пространства${LABEL_SEPARATOR}Открыть боковую панель${LABEL_SEPARATOR}Закрыть боковую панель${LABEL_SEPARATOR}Сохранить название чата${LABEL_SEPARATOR}Изменить название чата${LABEL_SEPARATOR}Удалить чат`,
  'vi-VN': `Truy cập không gian làm việc${LABEL_SEPARATOR}Mã truy cập${LABEL_SEPARATOR}Nhập mã truy cập không gian làm việc${LABEL_SEPARATOR}Mở thanh bên${LABEL_SEPARATOR}Đóng thanh bên${LABEL_SEPARATOR}Lưu tiêu đề cuộc trò chuyện${LABEL_SEPARATOR}Chỉnh sửa tiêu đề cuộc trò chuyện${LABEL_SEPARATOR}Xóa cuộc trò chuyện`,
  'zh-CN': `工作区访问${LABEL_SEPARATOR}访问令牌${LABEL_SEPARATOR}请输入工作区令牌${LABEL_SEPARATOR}打开侧边栏${LABEL_SEPARATOR}关闭侧边栏${LABEL_SEPARATOR}保存聊天标题${LABEL_SEPARATOR}编辑聊天标题${LABEL_SEPARATOR}删除聊天`,
  'zh-TW': `工作區存取${LABEL_SEPARATOR}存取權杖${LABEL_SEPARATOR}請輸入工作區權杖${LABEL_SEPARATOR}開啟側邊欄${LABEL_SEPARATOR}關閉側邊欄${LABEL_SEPARATOR}儲存聊天標題${LABEL_SEPARATOR}編輯聊天標題${LABEL_SEPARATOR}刪除聊天`,
} as const satisfies Record<string, string>

export type CommonLabelLocale = keyof typeof commonLabelsByLocale

export function getCommonLabels(locale: CommonLabelLocale) {
  const values = commonLabelsByLocale[locale].split(LABEL_SEPARATOR)

  return Object.fromEntries(
    commonLabelKeys.map((key, index) => [key, values[index] ?? '']),
  ) as Record<CommonLabelKey, string>
}
