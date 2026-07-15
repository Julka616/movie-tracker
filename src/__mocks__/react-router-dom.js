// Mock dla React Router DOM
const mockNavigate = jest.fn();
const mockUseNavigate = () => mockNavigate;

module.exports = {
  useNavigate: mockUseNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), () => {}],
  useLinkClickHandler: () => jest.fn(),
  useHref: () => '#',
  useResolvedPath: () => ({ pathname: '/', search: '', hash: '' }),
  BrowserRouter: ({ children }) => children,
  MemoryRouter: ({ children }) => children,
  Route: ({ element }) => element,
  Routes: ({ children }) => children,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: () => null,
  outlet: null,
};

module.exports.mockNavigate = mockNavigate;
