import { updateReady } from '../lib/offline'

export function UpdateBanner() {
  if (!updateReady.use()) return null
  return (
    <div class="toast" role="status">
      <span>Загружена новая версия справочника</span>
      <button class="btn btn--small" onClick={() => location.reload()}>
        Обновить
      </button>
    </div>
  )
}
