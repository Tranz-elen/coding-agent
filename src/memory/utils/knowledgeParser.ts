/**
 * 知识解析器：从 Markdown 中提取结构化知识点
 */

export interface KnowledgeItem {
  title: string;           // 知识点标题
  content: string;         // 完整内容
  level: number;           // 标题层级（1-6）
  parentTitle?: string;    // 父级标题
  tags: string[];          // 自动提取的标签
}

/**
 * 解析 Markdown 内容，提取知识点
 */
export function parseMarkdownToKnowledge(markdown: string): KnowledgeItem[] {
  const lines = markdown.split('\n');
  const items: KnowledgeItem[] = [];
  
  const titleStack: string[] = [];  // 标题栈，用于追踪父级
  
  let currentTitle = '';
  let currentLevel = 0;
  let currentContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测标题
    const titleMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (titleMatch) {
      // 保存之前的内容
      if (currentTitle && currentContent.length > 0) {
        items.push({
          title: currentTitle,
          content: currentContent.join('\n').trim(),
          level: currentLevel,
          parentTitle: titleStack[titleStack.length - 1],
          tags: extractTags(currentTitle, currentContent.join('\n'))
        });
      }
      
      // 开始新标题
      const level = titleMatch[1].length;
      const title = titleMatch[2].trim();
      
      // 更新标题栈
      if (level <= titleStack.length) {
        titleStack.splice(level - 1);
      }
      titleStack.push(title);
      
      currentTitle = title;
      currentLevel = level;
      currentContent = [];
    } else if (line.trim()) {
      // 非空行，添加到内容
      currentContent.push(line);
    }
  }
  
  // 保存最后一个
  if (currentTitle && currentContent.length > 0) {
    items.push({
      title: currentTitle,
      content: currentContent.join('\n').trim(),
      level: currentLevel,
      parentTitle: titleStack[titleStack.length - 2],
      tags: extractTags(currentTitle, currentContent.join('\n'))
    });
  }
  
  return items;
}

/**
 * 解析列表项为独立知识点
 */
export function parseListItems(markdown: string): KnowledgeItem[] {
  const items: KnowledgeItem[] = [];
  const lines = markdown.split('\n');
  
  let currentSection = '';
  let currentListItems: string[] = [];
  
  for (const line of lines) {
    // 检测标题
    const titleMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (titleMatch) {
      currentSection = titleMatch[2].trim();
    }
    
    // 检测列表项
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      const content = listMatch[1].trim();
      currentListItems.push(content);
    }
    
    // 遇到空行或新标题，保存列表项
    if ((line.trim() === '' || titleMatch) && currentListItems.length > 0) {
      for (const item of currentListItems) {
        // 提取关键词作为标题
        const colonIndex = item.indexOf('：');
        const title = colonIndex > 0 ? item.substring(0, colonIndex) : item.substring(0, 20);
        
        items.push({
          title,
          content: item,
          level: 3,
          parentTitle: currentSection,
          tags: extractTags(title, item)
        });
      }
      currentListItems = [];
    }
  }
  
  return items;
}

/**
 * 提取标签
 */
function extractTags(title: string, content: string): string[] {
  const tags: string[] = [];
  const text = (title + ' ' + content).toLowerCase();
  
  // 网文相关
  if (text.includes('网文') || text.includes('小说')) tags.push('网文');
  if (text.includes('玄幻') || text.includes('仙侠') || text.includes('都市')) tags.push('分类');
  if (text.includes('写作') || text.includes('技巧') || text.includes('黄金')) tags.push('写作技巧');
  if (text.includes('平台') || text.includes('起点') || text.includes('晋江')) tags.push('平台');
  if (text.includes('工具') || text.includes('软件')) tags.push('工具');
  if (text.includes('模板') || text.includes('开头')) tags.push('模板');
  if (text.includes('读者') || text.includes('市场')) tags.push('市场分析');
  if (text.includes('卡文') || text.includes('问题')) tags.push('问题解答');
  
  return [...new Set(tags)];
}

/**
 * 将知识点转换为存储格式
 */
export function knowledgeToStorageFormat(item: KnowledgeItem): string {
  const lines: string[] = [];
  lines.push(`## ${item.title}`);
  if (item.parentTitle) {
    lines.push(`> 所属：${item.parentTitle}`);
  }
  lines.push('');
  lines.push(item.content);
  return lines.join('\n');
}