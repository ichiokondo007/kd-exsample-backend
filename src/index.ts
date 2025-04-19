import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
	res.send('kd-exsample-backend サーバーが稼働中です');
});

app.listen(PORT, () => {
	console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
