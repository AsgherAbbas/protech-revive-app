import protechLogo from '../assets/protechlogo.webp';
import reviveLogo from '../assets/revivetechlogo.webp';

function normalizeCompany(company) {
  return company === 'Revive' || company === 'revive' ? 'Revive' : 'PROtech';
}

async function loadCompanyLogo(company) {
  const image = new Image();
  image.src = normalizeCompany(company) === 'Revive' ? reviveLogo.src : protechLogo.src;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext('2d').drawImage(image, 0, 0);

  return {
    data: canvas.toDataURL('image/png'),
    aspectRatio: image.naturalWidth / image.naturalHeight
  };
}

export async function renderCompanyLogo(pdf, company, { x = 18, centerY = 25 } = {}) {
  const logo = await loadCompanyLogo(company);
  const logoWidth = 28;
  const logoHeight = Math.min(18, logoWidth / logo.aspectRatio);
  const padding = 2.5;
  const containerX = x - padding;
  const containerY = centerY - (logoHeight / 2) - padding;

  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(containerX, containerY, logoWidth + (padding * 2), logoHeight + (padding * 2), 1.5, 1.5, 'F');
  pdf.addImage(logo.data, 'PNG', x, centerY - (logoHeight / 2), logoWidth, logoHeight, undefined, 'FAST');
}