// Yasaklı kelimeler listesi ve kelime varyasyonları
const bannedWords = [
  // Küfürler ve varyasyonları
  'amk', 'aq', 'oç', 'piç', 'yavşak', 'göt', 'siktir', 'pezevenk',
  'mal', 'gerizekalı', 'aptal', 'salak', 'dangalak', 'hıyar',
  'orospu', 'oruspu', '0rospu', 'or0spu', '0r0spu', 'orospı',
  'amına', 'amina', 'am1na', 'am!na', '@mina', '@min@',
  'sik', 's1k', 'sık', 's!k', 'siktir', 's1kt1r', 'sigtir',
  // İngilizce küfürler ve varyasyonları
  'fuck', 'fck', 'f*ck', 'fuk', 'fucc', 'fvck',
  'shit', 'sh1t', 'sh!t', 'sh*t', '$hit',
  'bitch', 'b1tch', 'b!tch', 'b*tch',
  'dick', 'd1ck', 'd!ck', 'd*ck',
  'ass', '@ss', '@s$', 'a$$',
  'bastard', 'b@stard', 'b@st@rd',
  // Nefret söylemi
  'terörist', 'terrorist', 'şerefsiz', 'namussuz', 'kahpe',
  // Özel karakterli varyasyonlar
  'a.m.k', 'a.q', 'skt.r', 'f.ck', 's.ktir',
  // Boşluklu varyasyonlar
  'a m k', 'a q', 'o ç', 'sik tir'
];

// Metin içinde yasaklı kelime kontrolü
export const containsProfanity = (text) => {
  if (!text) return false;
  
  // Metni küçük harfe çevir ve özel karakterleri kaldır
  let normalizedText = text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');

  // Boşlukları kaldırılmış versiyonu da kontrol et
  let noSpaceText = normalizedText.replace(/\s/g, '');
  
  // Sayıları harflere çevir (1 -> i, 3 -> e, 4 -> a, 0 -> o)
  let leetText = noSpaceText
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/7/g, 't');

  // Her bir yasaklı kelimeyi kontrol et
  return bannedWords.some(word => {
    // Normal kontrol
    if (normalizedText.includes(word)) return true;
    // Boşluksuz kontrol
    if (noSpaceText.includes(word)) return true;
    // Leet speak kontrolü
    if (leetText.includes(word)) return true;
    return false;
  });
};

// Görsel güvenlik kontrolü
export const validateImage = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      // Dosya tipi kontrolü
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Sadece JPG, PNG ve GIF formatları desteklenir.');
      }

      // Dosya boyutu kontrolü (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Görsel boyutu 10MB\'dan küçük olmalıdır.');
      }

      // Görseli bir img elementine yükle
      const img = document.createElement('img');
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        try {
          // Görsel boyutları kontrolü
          if (img.width > 5000 || img.height > 5000) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Görsel boyutları çok büyük.'));
            return;
          }

          // Basit renk analizi yaparak ten rengi oranını kontrol et
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          let skinColorPixels = 0;
          const totalPixels = data.length / 4;
          
          // Her piksel için RGB değerlerini kontrol et
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Ten rengi aralığını kontrol et
            if (isSkinColor(r, g, b)) {
              skinColorPixels++;
            }
          }
          
          // Ten rengi oranını hesapla
          const skinColorRatio = skinColorPixels / totalPixels;
          
          // Eğer ten rengi oranı belirli bir eşiği geçiyorsa reddet
          if (skinColorRatio > 0.3) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Bu görsel uygunsuz içerik barındırıyor olabilir.'));
            return;
          }

          URL.revokeObjectURL(objectUrl);
          resolve(true);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Görsel analizi sırasında bir hata oluştu.'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Görsel yüklenirken hata oluştu.'));
      };

      img.src = objectUrl;
    } catch (error) {
      reject(error);
    }
  });
};

// Ten rengi tespiti için yardımcı fonksiyon
function isSkinColor(r, g, b) {
  // RGB değerlerini normalize et
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  
  // Ten rengi için HSV değerlerini hesapla
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  
  // Hue hesapla
  let h = 0;
  if (delta !== 0) {
    if (max === nr) {
      h = ((ng - nb) / delta) % 6;
    } else if (max === ng) {
      h = (nb - nr) / delta + 2;
    } else {
      h = (nr - ng) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  
  // Saturation hesapla
  const s = max === 0 ? 0 : delta / max;
  
  // Value hesapla
  const v = max;
  
  // Ten rengi aralığını kontrol et
  return (
    h >= 0 && h <= 50 && // Ten rengi için hue aralığı
    s >= 0.1 && s <= 0.6 && // Ten rengi için saturation aralığı
    v >= 0.2 && v <= 1.0 // Ten rengi için value aralığı
  );
}