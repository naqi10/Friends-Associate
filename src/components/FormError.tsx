const MESSAGES: Record<string, string> = {
  required: "Please fill in all required fields.",
  slug: "Slug may only contain lowercase letters, numbers and single hyphens (e.g. faryk-residences-lahore).",
  "slug-taken": "Another project already uses this slug.",
  price: "Enter a valid price in whole rupees.",
  size: "File is too large (15 MB maximum).",
  type: "Unsupported file type. Upload PDF, image, Word or Excel files.",
  buyer: "Choose the buyer this private document belongs to.",
  email: "Enter a valid email address.",
  "email-taken": "Another account already uses this email address.",
  name: "Enter the customer's full name.",
  city: "Choose Lahore, Karachi or Rahim Yar Khan.",
  cnic: "CNIC must look like 35202-1234567-1.",
  password: "Password must be at least 10 characters and include a letter and a number.",
  "password-match": "The two passwords do not match.",
  limit: "This buyer already has the maximum of 10 bookings.",
  property: "That property is no longer available. Choose another unit.",
  overpaid: "Amount paid cannot be more than the total price.",
  amount: "Payment must be more than zero and no more than the outstanding balance.",
  date: "Enter valid dates.",
  number: "Enter whole numbers of zero or more.",
  link: "Button links must start with / (a page on this site) or https://.",
  image: "Image path must be a file under /images/ such as /images/hero.jpg.",
  missing: "That record no longer exists.",
  "booking-buyer": "Choose an active buyer account.",
  role: "Choose Sales, Project manager or Admin.",
  self: "You cannot remove your own admin role or disable your own account. Ask another admin.",
  "self-password": "Change your own password from My account, which asks for your current password.",
  "last-admin": "This is the last active admin. Make someone else an admin first.",
  current: "Your current password is incorrect.",
  same: "The new password must be different from the current one.",
  locked: "Too many wrong attempts. Please wait 15 minutes and try again.",
  category: "Choose a valid division and category.",
  stage: "Each stage needs a name, a percentage from 0 to 100, and an optional valid date.",
  "image-size": "Image is too large (10 MB maximum).",
  "image-type": "That file is not a supported image. Upload a JPG, PNG or WebP photo.",
  phone: "Enter a valid phone number, e.g. 0312-6711828.",
  "rate-limit": "Too many submissions from your connection. Please try again in a few minutes.",
  investment: "Choose an open investment opportunity.",
  guarantee: "The returns note must not promise guaranteed returns. Describe how returns are shared instead.",
  "payments-permission": "You can change the schedule, but changing the paid amount needs the Payments → Edit permission.",
};

export function FormError({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
      {MESSAGES[code] ?? "Something went wrong. Please check the form and try again."}
    </p>
  );
}
