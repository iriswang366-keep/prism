// 预设笔记模板数组 - 新用户注册时自动创建
export const defaultNoteTemplates = [
  {
    title: '欢迎来到折光 (Prism)：你的灵感收集站',
    summary: '<p>你好，欢迎使用折光 (Prism)。</p><p>这是一个帮助你收集、整理和连接知识碎片的个人空间。我们每天都会接收到大量的信息，但真正能沉淀下来并为我们所用的却很少。折光的设计初衷，就是让你能够用最低的阻力，记录下稍纵即逝的灵感。</p><p>你可以把它当作你的"第二大脑"。在这里，你不需要一开始就追求完美的排版或严谨的分类。先记录，再整理。当你积累的卡片越来越多，你会发现不同的想法之间会自然产生意想不到的连接。</p><p>祝你在这里搭建起属于自己的知识网络，使用愉快。</p>',
    tags: ['欢迎使用', '系统指南'],
    date: new Date().toISOString()
  },
  {
    title: '如何高效使用折光进行知识管理？',
    summary: '<p>为了让你更快上手，这里介绍几个折光的核心功能机制：</p><p><strong>闪电存入：</strong>在顶部的输入框粘贴一段长文、Markdown，或者直接贴入一个网页链接，点击「闪电存入」。系统会自动抓取内容、生成摘要并提取核心标签，帮你省去前期归类的麻烦。</p><p><strong>抽屉式编辑：</strong>点击任何一张笔记卡片，右侧会滑出详情抽屉。在这里，你可以对 AI 生成的摘要进行二次校对，增删不准确的标签，或者使用富文本编辑器（支持标题、加粗、列表、图片、表格等）进一步完善笔记正文。</p><p><strong>每日随机漫步：</strong>知识不应该被储存在角落落灰。点击左侧导航栏的"每日随机漫步"，系统会随机抽取一张你过去的笔记，帮助你打破信息茧房、回顾被遗忘的知识点。</p><p><strong>知识图谱：</strong>当你的标签与笔记越来越多，"知识图谱"会把它们织成一张可视化的网络，让你直观看到想法之间的连接。</p><p><strong>收藏与回收站：</strong>点击卡片上的爱心即可收藏重要笔记，在"我的收藏"中快速找回；误删的笔记也会进入"回收站"，随时可以恢复。</p><p>只需保持记录的习惯，剩下的交给时间。</p>',
    tags: ['功能教程', '知识管理', '效率工具'],
    date: new Date(Date.now() - 172800000).toISOString()
  },
  {
    title: '卡片盒笔记法 (Zettelkasten)：把碎片连成网络',
    summary: '<p>Zettelkasten（卡片盒笔记法）是德国社会学家卢曼提出的知识管理方法，他一生用它写下了数万张卡片，产出了大量高质量论文与著作。它的精髓不在于「记录」，而在于「连接」。</p><p><strong>原子化：</strong>每张卡片只记录一个独立、完整的想法。粒度越小，越容易在未来被重新组合到不同的语境中。</p><p><strong>用自己的话写：</strong>不要照抄原文，而是用自己的语言复述。这个「转译」的过程本身就是深度理解与记忆的关键。</p><p><strong>建立链接：</strong>新卡片诞生时，主动去寻找它与旧卡片之间的关系并建立引用。日积月累，这些链接会织成一张属于你自己的知识网络，让灵感在意想不到的地方相遇。</p><p>折光的「知识图谱」正是这一理念的可视化：当你的标签与笔记越来越多，图谱会自然浮现出你思考的结构。不妨从今天起，给每条笔记都认真打上标签。</p>',
    tags: ['知识管理', '方法论', '效率工具'],
    date: new Date(Date.now() - 86400000).toISOString()
  }
]

// 为新用户初始化预设笔记
export const initializeUserNotes = async (createNoteFn, userId) => {
  if (!userId) {
    console.error('初始化笔记失败：用户ID为空')
    return
  }

  const results = []
  for (const template of defaultNoteTemplates) {
    try {
        const noteWithUserId = {
        ...template,
        user_id: userId,
        // date 保留模板值(当下 / -1天 / -2天),created_at 跟随以保证排序一致
        created_at: template.date,
        updated_at: new Date().toISOString()
      }

      const result = await createNoteFn(noteWithUserId)
      results.push(result)
    } catch (error) {
      console.error('创建预设笔记失败:', template.title, error)
    }
  }

  return results
}
import { supabase } from '@/integrations/supabase/client'

// 只在该用户「一条笔记都没有」时,才用前端模板播种一次
export const seedNotesIfEmpty = async (createNoteFn, userId) => {
  if (!userId) return
  const { count, error } = await supabase
    .from('notes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('检查笔记数失败:', error)
    return
  }
  if (count === 0) {
    await initializeUserNotes(createNoteFn, userId)
  }
}