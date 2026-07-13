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
    summary: '<p>为了让你更快上手，这里介绍几个折光的核心功能机制：</p><p><strong>闪电存入：</strong>在顶部的输入框粘贴一段长文或随时想到的点子，点击存入。系统会自动为你生成内容摘要并提取核心标签，帮你省去前期归类的麻烦。</p><p><strong>抽屉式编辑：</strong>点击任何一张笔记卡片，右侧会滑出详情抽屉。在这里，你可以对 AI 生成的摘要进行二次校对，增删不准确的标签，或者使用富文本编辑器（支持标题、加粗、列表等）进一步完善笔记正文。</p><p><strong>每日随机漫步：</strong>知识不应该被储存在角落落灰。点击左侧导航栏的"每日随机漫步"，系统会随机抽取一张你过去的笔记。这个功能可以帮助你打破信息茧房，回顾被遗忘的知识点。如果产生了新的想法，点击"查看原文"即可立刻进入编辑状态。</p><p>只需保持记录的习惯，剩下的交给时间。</p>',
    tags: ['功能教程', '知识管理', '效率工具'],
    date: new Date(Date.now() - 86400000).toISOString()
  },
  {
    title: '《上瘾 (Hooked)》读书笔记：让用户养成习惯的四大逻辑',
    summary: '<p>最近阅读了尼尔·埃亚尔的《上瘾》(Hooked)，书中拆解了知名互联网产品是如何让用户养成使用习惯，甚至产生依赖的。核心是一个被称为"上瘾模型"的四步循环：</p><p><strong>触发 (Trigger)：</strong>分为外部触发（如消息推送、广告、按钮）和内部触发（如用户的情绪、无聊、焦虑感）。好产品最终都是将使用场景与用户的负面情绪（内部触发）深度绑定。</p><p><strong>行动 (Action)：</strong>用户为了获得酬赏而采取的简单行为。根据福格行为模型 (B=MAT)，行为发生需要动机、能力和触发齐备。产品设计要尽量降低用户的行动门槛，做到极简。</p><p><strong>多变的酬赏 (Variable Reward)：</strong>满足用户的需求并激发他们再次尝试的欲望。这里的关键是"不可预期性"（就像老虎机）。酬赏分为三类：社交酬赏（认同感）、猎物酬赏（如刷信息流寻找有用信息）和自我酬赏（完成任务的成就感和操纵感）。</p><p><strong>投入 (Investment)：</strong>用户在产品中投入的时间、数据、精力或金钱。投入越多，离开的沉没成本就越高，同时也为下一次"触发"做好了准备。</p><p>这个四步闭环模型，不仅对于互联网产品的商业化设计和增长策略很有启发，也有助于我们审视和控制自身的日常消费行为。</p>',
    tags: ['产品设计', '读书笔记', '商业分析'],
    date: new Date(Date.now() - 172800000).toISOString()
  },
  {
    title: '卡片盒笔记法 (Zettelkasten)：把碎片连成网络',
    summary: '<p>Zettelkasten（卡片盒笔记法）是德国社会学家卢曼提出的知识管理方法，他一生用它写下了数万张卡片，产出了大量高质量论文与著作。它的精髓不在于「记录」，而在于「连接」。</p><p><strong>原子化：</strong>每张卡片只记录一个独立、完整的想法。粒度越小，越容易在未来被重新组合到不同的语境中。</p><p><strong>用自己的话写：</strong>不要照抄原文，而是用自己的语言复述。这个「转译」的过程本身就是深度理解与记忆的关键。</p><p><strong>建立链接：</strong>新卡片诞生时，主动去寻找它与旧卡片之间的关系并建立引用。日积月累，这些链接会织成一张属于你自己的知识网络，让灵感在意想不到的地方相遇。</p><p>折光的「知识图谱」正是这一理念的可视化：当你的标签与笔记越来越多，图谱会自然浮现出你思考的结构。不妨从今天起，给每条笔记都认真打上标签。</p>',
    tags: ['知识管理', '方法论', '效率工具'],
    date: new Date(Date.now() - 259200000).toISOString()
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
        // 更新时间戳为当前时间
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
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
