import type { ParsedDataset } from '../types/data';

export function generateSampleDataset(): ParsedDataset {
  const count = 400;
  const rows: Record<string, any>[] = [];

  const genders = ['男', '女'];
  const dyslipidemiaTypes = ['正常', '輕度異常', '中度異常', '高危險'];
  const smokingTypes = ['無', '已戒菸', '偶爾', '每日'];

  for (let i = 1; i <= count; i++) {
    const isMale = Math.random() > 0.48;
    const age = Math.floor(22 + Math.random() * 55);

    // Correlated blood pressure
    const baseBP = 105 + (age - 20) * 0.4 + (isMale ? 4 : 0);
    const systolicNoise = (Math.random() - 0.5) * 20;
    let systolic: number | null = Math.round(baseBP + systolicNoise);

    // Diastolic correlated with systolic
    let diastolic: number | null = Math.round(systolic * 0.65 + (Math.random() - 0.5) * 10);

    // BMI
    let bmi: number | null = Number((21 + Math.random() * 8 + (Math.random() > 0.95 ? 12 : 0)).toFixed(1));

    // Blood sugar (right skewed)
    let glucose: number | null = Number(
      (85 + Math.pow(Math.random(), 2.5) * 120 + (age > 50 ? 15 : 0)).toFixed(1)
    );

    let smoking: string | null = smokingTypes[Math.floor(Math.random() * smokingTypes.length)];
    let lipid: string | null = dyslipidemiaTypes[Math.floor(Math.random() * dyslipidemiaTypes.length)];

    // Gene marker has high missing rate (65%)
    let geneMarker: string | null = Math.random() > 0.65 ? (Math.random() > 0.5 ? '陽性 (Positive)' : '陰性 (Negative)') : null;

    // Introduce systematic missingness:
    // When systolic is missing, diastolic is often also missing (80% correlated missing)
    if (Math.random() < 0.08) {
      systolic = null;
      if (Math.random() < 0.8) {
        diastolic = null;
      }
    } else if (Math.random() < 0.05) {
      diastolic = null;
    }

    // Age missing 3%
    let ageVal: number | null = Math.random() < 0.03 ? null : age;

    // BMI missing 5%
    if (Math.random() < 0.05) bmi = null;

    // Glucose missing 10%
    if (Math.random() < 0.1) glucose = null;

    // Smoking missing 12%
    if (Math.random() < 0.12) smoking = null;

    // Lipid missing 6%
    if (Math.random() < 0.06) lipid = null;

    rows.push({
      患者編號: `PT-${String(i).padStart(4, '0')}`,
      年齡: ageVal,
      性別: genders[isMale ? 0 : 1],
      收縮壓_mmHg: systolic,
      舒張壓_mmHg: diastolic,
      體重指數_BMI: bmi,
      空腹血糖_mgdL: glucose,
      血脂異常分類: lipid,
      吸菸習慣: smoking,
      基因特徵標記: geneMarker,
    });
  }

  const columns = [
    '患者編號',
    '年齡',
    '性別',
    '收縮壓_mmHg',
    '舒張壓_mmHg',
    '體重指數_BMI',
    '空腹血糖_mgdL',
    '血脂異常分類',
    '吸菸習慣',
    '基因特徵標記',
  ];

  return {
    filename: '醫療健檢臨床指標數據集.csv',
    fileSize: 42560,
    encoding: 'UTF-8',
    delimiter: ',',
    columns,
    columnTypes: {
      患者編號: 'categorical',
      年齡: 'numeric',
      性別: 'categorical',
      收縮壓_mmHg: 'numeric',
      舒張壓_mmHg: 'numeric',
      體重指數_BMI: 'numeric',
      空腹血糖_mgdL: 'numeric',
      血脂異常分類: 'categorical',
      吸菸習慣: 'categorical',
      基因特徵標記: 'categorical',
    },
    rows,
  };
}
