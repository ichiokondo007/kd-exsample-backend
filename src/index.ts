/**
 * Initializes the dotenv configuration to load environment variables.
 */
import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

/**
 * Express application instance.
 */
const app = express();

/**
 * Port number for the server, retrieved from environment variables.
 */
const PORT = process.env.PORT;

app.use(express.json());

/**
 * Directory path for storing uploaded files. If the directory does not exist, it is created recursively.
 */
const fileDir = path.join(__dirname, '../file');
if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
}

/**
 * Multer storage configuration for handling file uploads.
 * - `destination`: Specifies the directory where files will be stored.
 * - `filename`: Generates a unique filename using UUID and retains the original file extension.
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, fileDir);
    },
    filename: (req, file, cb) => {
        // UUIDを生成してファイル名に付与
        const fileId = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${fileId}${extension}`);
    }
});

/**
 * Multer middleware instance configured with the defined storage settings.
 */
const upload = multer({ storage });

/**
 * GET /
 * Root endpoint to verify that the server is running.
 * @param req - Express request object.
 * @param res - Express response object.
 * @returns A message indicating the server is operational.
 */
app.get('/', (req: Request, res: Response) => {
    res.send('kd-exsample-backend サーバーが稼働中です');
});

/**
 * POST /upload
 * Endpoint for uploading a single file.
 * @param req - Express request object with an optional `file` property added by Multer.
 * @param res - Express response object.
 * @returns A JSON response containing the UUID of the uploaded file and a success message.
 * @throws 400 - If no file is uploaded.
 */
app.post('/upload', upload.single('file'), (req: Request & { file?: Express.Multer.File }, res: Response): void => {
    if (!req.file) {
        res.status(400).json({ error: 'ファイルがアップロードされていません' });
        return;
    }
    // ファイル名からUUIDを抽出（拡張子を除く）
    const filename = req.file.filename;
    const fileId = path.parse(filename).name;

    // UUIDをレスポンスとして返す
    res.json({
        fileId,
        message: 'ファイルのアップロードに成功しました'
    });
});

/**
 * GET /file/:fileId
 * Endpoint to retrieve an uploaded file by its UUID.
 * @param req - Express request object containing the `fileId` parameter.
 * @param res - Express response object.
 * @returns The requested file if found.
 * @throws 404 - If the file with the specified UUID is not found.
 * @throws 500 - If a server error occurs while searching for the file.
 */
app.get('/file/:fileId', (req: Request, res: Response) => {
    const { fileId } = req.params;

    // ファイルディレクトリ内のファイルを検索
    fs.readdir(fileDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'サーバーエラーが発生しました' });
        }

        // fileIdで始まるファイルを探す
        const targetFile = files.find(file => file.startsWith(fileId));

        if (!targetFile) {
            return res.status(404).json({ error: 'ファイルが見つかりません' });
        }

        // ファイルを送信
        res.sendFile(path.join(fileDir, targetFile));
    });
});

/**
 * Directory path for storing canvas data. If the directory does not exist, it is created recursively.
 */
const canvasDir = path.join(__dirname, '../canvas');
if (!fs.existsSync(canvasDir)) {
    fs.mkdirSync(canvasDir, { recursive: true });
}

/**
 * POST /canvas
 * Endpoint for creating a new canvas.
 * @param req - Express request object containing canvas data in the body.
 * @param res - Express response object.
 * @returns A JSON response containing the created canvas data with a unique ID.
 */
app.post('/canvas', (req: Request, res: Response) => {
    try {
        const canvasData = req.body;

        // UUIDを生成してキャンバスに付与
        const canvasId = uuidv4();
        const newCanvas = {
            id: canvasId,
            ...canvasData,
            createAt: new Date().toISOString()
        };

        // キャンバスデータをファイルとして保存
        const filePath = path.join(canvasDir, `${canvasId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(newCanvas, null, 2));

        // 成功レスポンスを返す
        res.status(201).json(newCanvas);
    } catch (error) {
        console.error('キャンバス作成エラー:', error);
        res.status(500).json({
            error: 'キャンバスの作成に失敗しました',
            details: error instanceof Error ? error.message : '不明なエラー'
        });
    }
});

/**
 * GET /canvas
 * Endpoint for retrieving all canvases.
 * @param req - Express request object.
 * @param res - Express response object.
 * @returns A JSON array containing all canvas data.
 */
app.get('/canvas', (req: Request, res: Response) => {
    try {
        // canvasDirが存在しない場合は作成
        if (!fs.existsSync(canvasDir)) {
            fs.mkdirSync(canvasDir, { recursive: true });
            return res.json([]);
        }

        // ディレクトリ内のすべてのJSONファイルを読み込む
        const files = fs.readdirSync(canvasDir).filter(file => file.endsWith('.json'));
        const canvases = files.map(file => {
            const filePath = path.join(canvasDir, file);
            const fileData = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(fileData);
        });

        // キャンバス一覧を日付の新しい順に並べ替えて返す
        canvases.sort((a, b) => b.createDate - a.createDate);
        res.json(canvases);
    } catch (error) {
        console.error('キャンバス一覧取得エラー:', error);
        res.status(500).json({
            error: 'キャンバス一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : '不明なエラー'
        });
    }
});

/**
 * GET /canvas/:id
 * Endpoint for retrieving a specific canvas by ID.
 * @param req - Express request object containing the canvas ID parameter.
 * @param res - Express response object.
 * @returns A JSON response containing the requested canvas data.
 * @throws 404 - If the canvas with the specified ID is not found.
 */
app.get('/canvas/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const filePath = path.join(canvasDir, `${id}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: '指定されたキャンバスが見つかりません' });
        }

        const fileData = fs.readFileSync(filePath, 'utf-8');
        res.json(JSON.parse(fileData));
    } catch (error) {
        console.error('キャンバス取得エラー:', error);
        res.status(500).json({
            error: 'キャンバスの取得に失敗しました',
            details: error instanceof Error ? error.message : '不明なエラー'
        });
    }
});

/**
 * Starts the Express server and listens on the specified port.
 * Logs the server URL to the console upon successful startup.
 */
app.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
