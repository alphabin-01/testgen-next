import { DM_Sans, Brygada_1918 } from 'next/font/google'
import { Toaster } from "@/components/ui/toaster"
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const brygada = Brygada_1918({
  subsets: ['latin'],
  variable: '--font-brygada',
})

export const metadata = {
  title: 'TestGen',
  description: 'Test Generation Application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" /> */}
        {/* <link rel="manifest" href="/site.webmanifest" /> */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${dmSans.variable} ${brygada.variable} font-dmsans antialiased bg-background`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
