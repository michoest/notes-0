import { useNotesStore } from '../stores/notes'

export function useAI() {
  const store = useNotesStore()

  async function categorize(text) {
    if (!store.settings.openaiApiKey) {
      return { listId: 'inbox', text }
    }

    const listsContext = store.lists.map(list => {
      const items = store.items
        .filter(i => i.listId === list.id && !i.completed)
        .slice(0, 5)
        .map(i => i.text)
      
      return {
        id: list.id,
        name: list.name,
        description: list.description || '',
        sampleItems: items
      }
    })

    const prompt = `You are a note categorization assistant. Given the following lists and a new item, determine the best list for the item.

Lists:
${listsContext.map(l => `- "${l.name}" (id: ${l.id}): ${l.description}${l.sampleItems.length ? `\n  Sample items: ${l.sampleItems.join(', ')}` : ''}`).join('\n')}

New item: "${text}"

Respond with JSON only:
{
  "listId": "the best matching list id",
  "cleanedText": "the item text, cleaned up if needed (fix typos, improve clarity, but keep the meaning)"
}
`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${store.settings.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) throw new Error('API error')

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)
      
      // Validate listId exists
      const validList = store.lists.find(l => l.id === result.listId)
      
      return {
        listId: validList ? result.listId : 'inbox',
        text: result.cleanedText || text
      }
    } catch (err) {
      console.error('AI categorization failed:', err)
      return { listId: 'inbox', text }
    }
  }

  return { categorize }
}