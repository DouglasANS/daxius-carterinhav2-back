const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  console.log(token)

  try {
    console.log('process.env.JWT_SECRET', process.env.JWT_SECRET)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Guarda as informações úteis do token no request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      cpf: decoded.cpf
    };

    // Também adiciona IP e User-Agent (opcional)
    const xff = req.headers['x-forwarded-for'];
    req.user.ip = xff ? xff.split(',')[0].trim() : (req.headers['x-real-ip'] || req.ip);
    req.user.userAgent = req.headers['user-agent'] || null;

    return next();
  } catch (err) {
    console.error('Erro ao validar token:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }
};
