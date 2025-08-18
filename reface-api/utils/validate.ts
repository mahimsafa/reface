import { Request, Response, NextFunction } from 'express';

const validate = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (e) {
      return res.status(400).json({ errors: (e as any).errors });
    }
  };
  
export default validate;
