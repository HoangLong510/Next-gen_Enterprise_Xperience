export const getAccountFullNameAndTitle = (account) => {
  const fullName = [account?.lastName, account?.firstName]
    .filter(Boolean).join(" ").trim()
    || account?.employeeName || account?.username || "";
  const title = account?.employeeTitle || account?.position || account?.role || "";
  return { fullName, title };
};

export const formatNumber = (n) =>
  (n ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const numToWords = (input) => {
  let number = Math.floor(Number(input) || 0);
  if (number === 0) return "Không đồng";

  const UNITS = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
  const DIGITS = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];

  const read3 = (n) => {
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    let s = "";

    if (hundreds > 0) {
      s += DIGITS[hundreds] + " trăm";
      if (tens === 0 && ones > 0) s += " lẻ";
    }

    if (tens > 1) {
      s += (s ? " " : "") + DIGITS[tens] + " mươi";
      if (ones === 1) s += " mốt";
      else if (ones === 5) s += " lăm";
      else if (ones > 0) s += " " + DIGITS[ones];
    } else if (tens === 1) {
      s += (s ? " " : "") + "mười";
      if (ones === 1) s += " một";
      else if (ones === 5) s += " lăm";
      else if (ones > 0) s += " " + DIGITS[ones];
    } else if (hundreds === 0 && ones > 0) {
      s += (s ? " " : "") + DIGITS[ones];
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
      if (n < 10) seg = "lẻ " + DIGITS[n];
      else seg = read3(n);
    } else {
      seg = read3(n);
    }
    if (seg) words += (words ? " " : "") + seg + UNITS[i];
  }

  words = words.trim().replace(/\s+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1) + " đồng";
};
