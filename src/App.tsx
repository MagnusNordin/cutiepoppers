import React, { useState, useEffect } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Typography,
  Container,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import ProductGrid from "./components/ProductGrid";
import ProductDetailPopup from "./components/ProductDetailPopup";
import { Product } from "./types/Product";
import { Image } from "@mui/icons-material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#f9dbf6",
    },
    secondary: {
      main: "#3498db",
    },
    background: {
      default: "#f9dbf6",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
      },
    },
  },
});

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
        const response = await fetch(`${base}/products.json`);
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <img
            src="logo192.png"
            alt="Logo"
            style={{
              display: "block",
            }}
          />

          <ProductGrid
            products={products}
            onProductClick={handleProductClick}
          />
        </Container>

        <ProductDetailPopup
          product={selectedProduct}
          open={popupOpen}
          onClose={handleClosePopup}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
