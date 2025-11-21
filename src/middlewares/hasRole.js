module.exports = function hasRole(requiredRole) {
    return (req, res, next) => {
      if (typeof req.role === 'undefined') {
        console.log(req)
        return res.status(401).json({ error: 'Não autenticado' });
      }
  
      if (req.role !== requiredRole) {
        return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
      }
  
      next();
    };
  };