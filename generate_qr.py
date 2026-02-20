# Generates a QR code for the given URL and saves it as qr.png
import qrcode

url = "https://meracoid-price-tracker.netlify.app/"
img = qrcode.make(url)
img.save("qr.png")
print("QR code saved as qr.png")
