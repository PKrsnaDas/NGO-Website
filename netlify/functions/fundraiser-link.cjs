const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NETLIFY_DATABASE_URL);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type': 'application/json'
};

const ensureTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS fundraiser_links (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      student_name VARCHAR(200) NOT NULL,
      roll_no VARCHAR(50),
      batch VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      show_on_dashboard BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    await ensureTable();

    /* ── GET ─────────────────────────────────────────────── */
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};

      // ?slug=SLUG  → get one active link by slug (used by donate page)
      if (params.slug) {
        const rows = await sql`
          SELECT * FROM fundraiser_links WHERE slug = ${params.slug} AND is_active = true
        `;
        if (rows.length === 0)
          return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Link not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, link: rows[0] }) };
      }

      // ?roll=ROLLNO  → get link for a student by roll number
      if (params.roll) {
        const rows = await sql`
          SELECT * FROM fundraiser_links WHERE roll_no = ${params.roll}
        `;
        if (rows.length === 0)
          return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, link: rows[0] }) };
      }

      // ?all=true  → get all active public links (for dashboard display)
      if (params.all) {
        const rows = await sql`
          SELECT * FROM fundraiser_links WHERE is_active = true ORDER BY created_at DESC
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, links: rows }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing query param: slug, roll, or all' }) };
    }

    /* ── POST — create / upsert a fundraiser link ─────────── */
    if (event.httpMethod === 'POST') {
      const { slug, studentName, rollNo, batch } = JSON.parse(event.body || '{}');

      if (!slug || !studentName)
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'slug and studentName are required' }) };

      const rows = await sql`
        INSERT INTO fundraiser_links (slug, student_name, roll_no, batch)
        VALUES (${slug}, ${studentName}, ${rollNo || ''}, ${batch || ''})
        ON CONFLICT (slug) DO UPDATE
          SET student_name = ${studentName},
              roll_no      = ${rollNo || ''},
              batch        = ${batch || ''}
        RETURNING *
      `;

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, link: rows[0] }) };
    }

    /* ── PATCH — toggle show_on_dashboard or is_active ────── */
    if (event.httpMethod === 'PATCH') {
      const { slug } = event.queryStringParameters || {};
      if (!slug)
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing slug query param' }) };

      const body = JSON.parse(event.body || '{}');
      let rows;

      if (body.showOnDashboard !== undefined) {
        rows = await sql`
          UPDATE fundraiser_links SET show_on_dashboard = ${body.showOnDashboard}
          WHERE slug = ${slug} RETURNING *
        `;
      } else if (body.isActive !== undefined) {
        rows = await sql`
          UPDATE fundraiser_links SET is_active = ${body.isActive}
          WHERE slug = ${slug} RETURNING *
        `;
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Provide showOnDashboard or isActive' }) };
      }

      if (!rows || rows.length === 0)
        return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Link not found' }) };

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, link: rows[0] }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };

  } catch (err) {
    console.error('fundraiser-link error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
