import { createError, eventHandler, getQuery } from 'h3'

export default eventHandler(async (event) => {
  const query = getQuery(event)
  let id = query.id as string
  const target = query.target as string

  if (!id) {
    throw createError({
      status: 400,
      statusText: 'Missing id parameter',
    })
  }

  if (!target) {
    throw createError({
      status: 400,
      statusText: 'Missing target parameter',
    })
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  // First, get the link by slug
  id = id.toLowerCase()

  const existingLink = await KV.get(`link:${id}`, { type: 'json' })

  if (!existingLink) {
    throw createError({
      status: 404,
      statusText: 'Link not found',
    })
  }

  if (!existingLink.url?.startsWith('https://waytoagi.me/bind_short')) {
    throw createError({
      status: 409,
      statusText: 'Slug is reserved',
    })
  }

  // Update the link URL
  const newLink = {
    ...existingLink,
    url: `https://page.waytoagi.me/${target}`,
    updatedAt: Math.floor(Date.now() / 1000),
  }

  const expiration = getExpiration(event, newLink.expiration)

  // Save the updated link
  await KV.put(`link:${id}`, JSON.stringify(newLink), {
    expiration,
    metadata: {
      expiration,
      url: newLink.url,
      comment: newLink.comment,
    },
  })

  // Return the updated link with short URL
  const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${id}`
  return { link: newLink, shortLink }
})
