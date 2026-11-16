# 10K Follow Assistant

رابط GitHub Pages به‌تنهایی نمی‌تواند Client Secret را امن نگه دارد. برای همین رابط سایت از طریق Cloudflare Worker سرو می‌شود و Worker ورود GitHub و درخواست‌های API را سمت سرور انجام می‌دهد.

## فایل‌ها
- `index.html`: رابط فارسی و موبایل‌پسند.
- `worker.js`: واسط امن OAuth و GitHub API.

## راه‌اندازی یک‌باره Cloudflare

1. در Cloudflare وارد **Workers & Pages** شو و **Create application → Create Worker** را بزن.
2. نام Worker را مثلاً `follow-assistant` بگذار و Deploy کن.
3. از صفحه Worker گزینه **Edit code** را بزن، محتوای فایل `worker.js` این مخزن را جایگزین کد نمونه کن و Deploy کن.
4. از **Settings → Variables and Secrets** این موارد را اضافه کن:
   - متغیر معمولی با نام `GITHUB_CLIENT_ID` و مقدار Client ID برنامه OAuth.
   - متغیر از نوع **Secret** با نام `GITHUB_CLIENT_SECRET` و مقدار Client Secret برنامه OAuth.
   سپس Deploy کن.
5. آدرس Worker معمولاً شبیه `https://follow-assistant.<account>.workers.dev` است. آن را باز کن؛ Worker رابط سایت GitHub Pages را از همان مبدأ نمایش می‌دهد.
6. در تنظیمات OAuth App در GitHub:
   - **Homepage URL** را برابر آدرس Worker قرار بده.
   - **Authorization callback URL** را برابر آدرس Worker به‌اضافه `/callback` قرار بده؛ مثلاً `https://follow-assistant.<account>.workers.dev/callback`.
   - ذخیره کن.

بعد از این تنظیمات، فقط از آدرس Worker استفاده کن، نه آدرس مستقیم GitHub Pages. دکمه ورود باید به GitHub برود و پس از تأیید به سایت برگردد.

## امنیت
- Client Secret را فقط به‌صورت Secret در Cloudflare وارد کن؛ آن را در GitHub، فایل‌ها، مرورگر یا چت قرار نده.
- توکن GitHub در کوکی `HttpOnly; Secure; SameSite=Lax` نگهداری می‌شود و JavaScript صفحه به آن دسترسی ندارد.
- مجوز درخواستی `user:follow` است.
- هر Follow جداگانه با تأیید کاربر انجام می‌شود؛ فالو انبوه خودکار وجود ندارد.
- اگر Client Secret قبلاً جایی عمومی شده، آن را در تنظیمات GitHub باطل و Secret جدید بساز.

## مستندات رسمی
- GitHub OAuth web application flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
