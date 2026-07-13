import { render, screen, fireEvent } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import KnowledgeCard from '../KnowledgeCard'

const mockCard = {
  title: '测试卡片标题',
  summary: '这是一个测试卡片的摘要内容',
  tags: ['测试', '开发'],
  date: '2023-01-01'
}

test('renders knowledge card with correct content', () => {
  render(<KnowledgeCard {...mockCard} />)
  
  expect(screen.getByText('测试卡片标题')).toBeInTheDocument()
  expect(screen.getByText('这是一个测试卡片的摘要内容')).toBeInTheDocument()
  expect(screen.getByText('#测试')).toBeInTheDocument()
  expect(screen.getByText('#开发')).toBeInTheDocument()
})

test('calls onClick when card is clicked', () => {
  const handleClick = vi.fn()
  render(<KnowledgeCard {...mockCard} onClick={handleClick} />)
  
  fireEvent.click(screen.getByText('测试卡片标题').closest('div'))
  expect(handleClick).toHaveBeenCalledWith(mockCard)
})

test('calls onTagClick when tag is clicked', () => {
  const handleTagClick = vi.fn()
  render(<KnowledgeCard {...mockCard} onTagClick={handleTagClick} />)
  
  fireEvent.click(screen.getByText('#测试'))
  expect(handleTagClick).toHaveBeenCalledWith('测试')
})
