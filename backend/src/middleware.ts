import { Request, Response, NextFunction } from 'express';

export function validateRequestBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({ error: 'Request body is required' });
    return;
  }
  next();
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}