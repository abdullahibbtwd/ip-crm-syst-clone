import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  clampPage,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  parsePageSize,
} from '@/lib/pagination'

type PageSizeInputProps = {
  pageSize: number
  isLoading?: boolean
  onPageSizeChange: (pageSize: number) => void
}

export function PageSizeInput({ pageSize, isLoading, onPageSizeChange }: PageSizeInputProps) {
  const { t } = useTranslation('common')
  const [input, setInput] = useState(String(pageSize))

  useEffect(() => {
    setInput(String(pageSize))
  }, [pageSize])

  const applyPageSize = () => {
    const parsed = Number.parseInt(input.trim(), 10)
    if (!Number.isFinite(parsed)) {
      setInput(String(pageSize))
      return
    }

    const nextSize = parsePageSize(input, pageSize)
    setInput(String(nextSize))
    if (nextSize !== pageSize) onPageSizeChange(nextSize)
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">{t('pagination.perPageLabel')}</span>
      <Input
        type="number"
        min={MIN_PAGE_SIZE}
        max={MAX_PAGE_SIZE}
        value={input}
        disabled={isLoading}
        className="h-8 w-16 bg-background px-2 text-center tabular-nums"
        aria-label={t('pagination.perPageLabel')}
        title={t('pagination.maxPerPage', { max: MAX_PAGE_SIZE })}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            applyPageSize()
          }
        }}
      />
      <span className="text-sm text-muted-foreground">{t('pagination.perPage')}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLoading}
        onClick={applyPageSize}
      >
        {t('actions.save')}
      </Button>
    </div>
  )
}

type PageJumpInputProps = {
  page: number
  pageCount?: number
  isLoading?: boolean
  onPageChange: (page: number) => void
}

export function PageJumpInput({ page, pageCount, isLoading, onPageChange }: PageJumpInputProps) {
  const { t } = useTranslation('common')
  const [input, setInput] = useState(String(page))

  useEffect(() => {
    setInput(String(page))
  }, [page])

  const applyPage = () => {
    const parsed = Number.parseInt(input.trim(), 10)
    if (!Number.isFinite(parsed)) {
      setInput(String(page))
      return
    }

    const nextPage = clampPage(parsed, pageCount)
    setInput(String(nextPage))
    if (nextPage !== page) onPageChange(nextPage)
  }

  const disabled = isLoading || pageCount == null || pageCount <= 1

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">{t('pagination.pageLabel')}</span>
      <Input
        type="number"
        min={1}
        max={pageCount ?? undefined}
        value={input}
        disabled={disabled}
        className="h-8 w-14 bg-background px-2 text-center tabular-nums"
        aria-label={t('pagination.pageLabel')}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            applyPage()
          }
        }}
      />
      {pageCount != null && pageCount > 0 ? (
        <span className="text-sm text-muted-foreground">
          {t('pagination.ofPages', { count: pageCount })}
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={applyPage}
      >
        {t('pagination.go')}
      </Button>
    </div>
  )
}

type ListTablePaginationControlsProps = {
  page: number
  pageSize: number
  pageCount?: number
  isLoading?: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function ListTablePaginationControls({
  page,
  pageSize,
  pageCount,
  isLoading,
  onPreviousPage,
  onNextPage,
  onPageChange,
  onPageSizeChange,
}: ListTablePaginationControlsProps) {
  const { t } = useTranslation('common')
  const hasPreviousPage = page > 1
  const hasNextPage = pageCount != null && page < pageCount

  return (
    <div className="flex flex-wrap items-center gap-3">
      <PageSizeInput
        pageSize={pageSize}
        isLoading={isLoading}
        onPageSizeChange={onPageSizeChange}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || !hasPreviousPage}
          onClick={onPreviousPage}
        >
          <ChevronLeft className="size-4" />
          {t('actions.previous')}
        </Button>
        <PageJumpInput
          page={page}
          pageCount={pageCount}
          isLoading={isLoading}
          onPageChange={onPageChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || !hasNextPage}
          onClick={onNextPage}
        >
          {t('actions.next')}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
