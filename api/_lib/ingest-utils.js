export function chunkMarkdown(content, source) {
  const sections = content.split(/^## /m);
  const chunks = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    const firstNewline = trimmed.indexOf('\n');
    const heading = firstNewline > -1 ? trimmed.slice(0, firstNewline).trim() : trimmed;
    const body = firstNewline > -1 ? trimmed.slice(firstNewline).trim() : '';
    const text = body || heading;
    if (!text) continue;
    chunks.push({
      text: `## ${heading}\n\n${text}`,
      metadata: { source, type: 'markdown', section: heading },
    });
  }
  return chunks;
}

export function chunkPortfolioJson(json) {
  const chunks = [];

  for (const project of json.projects ?? []) {
    const text = [
      `Project: ${project.title}`,
      project.subtitle ? `Subtitle: ${project.subtitle}` : '',
      `Description: ${project.description}`,
      `Tags: ${(project.tags ?? []).join(', ')}`,
      project.links?.github ? `GitHub: ${project.links.github}` : '',
      project.links?.demo ? `Demo: ${project.links.demo}` : '',
    ].filter(Boolean).join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'project', entity_id: project.id },
    });
  }

  for (const exp of json.experience ?? []) {
    const text = [
      `${exp.company} — ${exp.role}`,
      exp.dates,
      ...(exp.bullets ?? []),
    ].join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'experience', entity_id: exp.company },
    });
  }

  for (const edu of json.education ?? []) {
    const text = [
      `${edu.degree} · ${edu.school}`,
      edu.dates,
      edu.gpa ?? '',
      ...(edu.bullets ?? []),
    ].filter(Boolean).join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'education', entity_id: edu.school },
    });
  }

  if (json.skills && Object.keys(json.skills).length > 0) {
    const text = Object.entries(json.skills)
      .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
      .join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'skills', entity_id: 'skills' },
    });
  }

  return chunks;
}

export function chunkCode(content, metadata) {
  return {
    text: content,
    metadata: { source: 'github', type: 'code', ...metadata },
  };
}
