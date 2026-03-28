export const encryptTableId = (tableId) => {
  const str = String(tableId);
  const secret = 'res2026sec';
  
  // Create a 16-character random salt to make the token long and dynamic
  const salt = Array.from({length: 16}, () => Math.random().toString(36).charAt(2) || 'x').join('');
  const payload = `${salt}:${str}`;
  
  let res = '';
  for (let i = 0; i < payload.length; i++) {
    res += String.fromCharCode(payload.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return btoa(res).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const decryptTableId = (encrypted) => {
  try {
    if (!encrypted || encrypted.length < 2) return encrypted;

    let str = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4 !== 0) str += '=';
    const decoded = atob(str);
    const secret = 'res2026sec';
    let res = '';
    for (let i = 0; i < decoded.length; i++) {
      res += String.fromCharCode(decoded.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
    }
    
    // Check if it's the new dynamic salted payload (salt:tableId)
    if (res.includes(':')) {
      const extracted = res.split(':')[1];
      if (extracted && extracted.trim() !== '') {
        return extracted;
      }
    }
    
    if (isNaN(res)) return encrypted;
    
    return res;
  } catch (e) {
    return encrypted;
  }
};
