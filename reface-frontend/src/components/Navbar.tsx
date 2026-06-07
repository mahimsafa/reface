import { Link, useLocation } from 'react-router-dom'
import { Shuffle, Images, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

const Navbar = () => {
  const location = useLocation()

  const links = [
    { name: 'Face Swap', href: '/', icon: Shuffle },
    { name: 'History', href: '/processed', icon: Images },
  ]

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Reface</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = link.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.href)
                return (
                  <Button
                    key={link.name}
                    variant={isActive ? 'secondary' : 'ghost'}
                    asChild
                  >
                    <Link to={link.href} className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {link.name}
                    </Link>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
