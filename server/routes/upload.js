import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const router = Router();

let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

// Use memory storage — file stays in req.file.buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

// POST /api/upload — Handle file uploads (images and PDFs)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    const storagePath = `${req.userId}/${storedName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await getSupabase()
      .storage
      .from('uploads')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = getSupabase()
      .storage
      .from('uploads')
      .getPublicUrl(storagePath);

    const result = {
      filename: req.file.originalname,
      storedName,
      url: publicUrl,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    // If PDF, parse text content from the in-memory buffer
    if (req.file.mimetype === 'application/pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(req.file.buffer);
        result.parsedText = pdfData.text;
        result.pageCount = pdfData.numpages;
      } catch (pdfError) {
        console.error('PDF parse error:', pdfError);
        result.parsedText = '(Failed to parse PDF text)';
        result.pageCount = 0;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export default router;
