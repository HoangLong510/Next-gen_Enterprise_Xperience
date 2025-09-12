import i18n from "i18next";

export const getAccountFullNameAndTitle = (account) => {
  const fullName = [account?.lastName, account?.firstName]
    .filter(Boolean).join(" ").trim()
    || account?.employeeName || account?.username || "";
  const title = account?.employeeTitle || account?.position || account?.role || "";
  return { fullName, title };
};

export const formatNumber = (n) =>
  (n ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, i18n.language === "vi" ? "." : ",");

const numToVietnameseWords = (input) => {
  let number = Math.floor(Number(input) || 0);
  if (number === 0) return "không đồng";

  const UNITS = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
  const DIG = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];

  const read3 = (n) => {
    const tr = Math.floor(n / 100);
    const ch = Math.floor((n % 100) / 10);
    const dv = n % 10;
    let s = "";

    if (tr > 0) {
      s += DIG[tr] + " trăm";
      if (ch === 0 && dv > 0) s += " lẻ";
    }

    if (ch > 1) {
      s += (s ? " " : "") + DIG[ch] + " mươi";
      if (dv === 1) s += " mốt";
      else if (dv === 5) s += " lăm";
      else if (dv > 0) s += " " + DIG[dv];
    } else if (ch === 1) {
      s += (s ? " " : "") + "mười";
      if (dv === 1) s += " một";
      else if (dv === 5) s += " lăm";
      else if (dv > 0) s += " " + DIG[dv];
    } else if (tr === 0 && dv > 0) {
      s += (s ? " " : "") + DIG[dv];
    }

    return s;
  };

  const blocks = [];
  while (number > 0 && blocks.length < UNITS.length) {
    blocks.push(number % 1000);
    number = Math.floor(number / 1000);
  }

  let words = "";
  for (let i = blocks.length - 1; i >= 0; i--) {
    const n = blocks[i];
    if (n === 0) continue;
    let seg = "";
    if (i === 0 && blocks.length > 1 && n < 100) {
      if (n < 10) seg = "lẻ " + DIG[n];
      else seg = read3(n); 
    } else {
      seg = read3(n);
    }
    if (seg) words += (words ? " " : "") + seg + UNITS[i];
  }

  words = words.trim().replace(/\s+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1) + " đồng";
};

const numToEnglishWords = (input) => {
  let number = Math.floor(Number(input) || 0);
  if (number === 0) return "Zero dollars";

  const UNITS = ["", " thousand", " million", " billion", " trillion", " quadrillion"];
  const DIG = ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
               "eleven","twelve","thirteen","fourteen","fifteen","sixteen",
               "seventeen","eighteen","nineteen"];
  const TENS = ["", "", "twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

  const read3 = (n) => {
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    let s = "";

    if (hundreds > 0) {
      s += DIG[hundreds] + " hundred";
      if (n % 100 > 0) s += " ";
    }

    if (n % 100 < 20 && n % 100 > 0) {
      s += DIG[n % 100];
    } else if (n % 100 >= 20) {
      s += TENS[tens];
      if (ones > 0) s += "-" + DIG[ones];
    }

    return s.trim();
  };

  const blocks = [];
  while (number > 0 && blocks.length < UNITS.length) {
    blocks.push(number % 1000);
    number = Math.floor(number / 1000);
  }

  let words = "";
  for (let i = blocks.length - 1; i >= 0; i--) {
    const n = blocks[i];
    if (n === 0) continue;
    let seg = read3(n);
    if (seg) words += (words ? " " : "") + seg + UNITS[i];
  }

  words = words.trim().replace(/\s+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1) + " dollars";
};

export const numToWords = (input) => {
  return i18n.language === "vi"
    ? numToVietnameseWords(input)
    : numToEnglishWords(input);
};
