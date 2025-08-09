import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Chip,
  Autocomplete,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Person as PersonIcon,
  FormatQuote as FormatQuoteIcon,
  Visibility as VisibilityIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { api } from '../services/api';
import { format } from 'date-fns';

const Admin = () => {
  const theme = useTheme();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({
    page: 0,
    rowsPerPage: 10,
    totalCount: 0,
  });
  
  // Quotes state
  const [quotes, setQuotes] = useState([]);
  const [quotesPagination, setQuotesPagination] = useState({
    page: 0,
    rowsPerPage: 10,
    totalCount: 0,
  });
  
  // Activity state
  const [activity, setActivity] = useState([]);
  const [activityPagination, setActivityPagination] = useState({
    page: 0,
    rowsPerPage: 10,
    totalCount: 0,
  });
  
  // Dialog states
  const [quoteDialog, setQuoteDialog] = useState({
    open: false,
    mode: 'add', // 'add' or 'edit'
    data: {
      _id: '',
      text: '',
      author: '',
      source: '',
      tags: [],
    },
  });
  
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: '', // 'quote' or 'user'
    id: '',
    name: '',
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      fetchStats();
    } else if (tabValue === 1) {
      fetchUsers();
    } else if (tabValue === 2) {
      fetchQuotes();
    } else if (tabValue === 3) {
      fetchActivity();
    }
  }, [tabValue]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { page, rowsPerPage } = usersPagination;
      const data = await api.getAdminUsers(page, rowsPerPage);
      setUsers(data.users);
      setUsersPagination({
        ...usersPagination,
        totalCount: data.totalCount,
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { page, rowsPerPage } = quotesPagination;
      const data = await api.getAdminQuotes(page, rowsPerPage);
      setQuotes(data.quotes);
      setQuotesPagination({
        ...quotesPagination,
        totalCount: data.totalCount,
      });
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const { page, rowsPerPage } = activityPagination;
      const data = await api.getAdminActivity(page, rowsPerPage);
      setActivity(data.activity);
      setActivityPagination({
        ...activityPagination,
        totalCount: data.totalCount,
      });
    } catch (err) {
      console.error('Error fetching activity:', err);
      setError('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleUserPageChange = (event, newPage) => {
    setUsersPagination({
      ...usersPagination,
      page: newPage,
    });
    fetchUsers();
  };

  const handleUserRowsPerPageChange = (event) => {
    setUsersPagination({
      ...usersPagination,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0,
    });
    fetchUsers();
  };

  const handleQuotePageChange = (event, newPage) => {
    setQuotesPagination({
      ...quotesPagination,
      page: newPage,
    });
    fetchQuotes();
  };

  const handleQuoteRowsPerPageChange = (event) => {
    setQuotesPagination({
      ...quotesPagination,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0,
    });
    fetchQuotes();
  };

  const handleActivityPageChange = (event, newPage) => {
    setActivityPagination({
      ...activityPagination,
      page: newPage,
    });
    fetchActivity();
  };

  const handleActivityRowsPerPageChange = (event) => {
    setActivityPagination({
      ...activityPagination,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0,
    });
    fetchActivity();
  };

  const handleOpenQuoteDialog = (mode, quote = null) => {
    setQuoteDialog({
      open: true,
      mode,
      data: quote ? { ...quote } : {
        _id: '',
        text: '',
        author: '',
        source: '',
        tags: [],
      },
    });
  };

  const handleCloseQuoteDialog = () => {
    setQuoteDialog({
      ...quoteDialog,
      open: false,
    });
  };

  const handleQuoteDialogChange = (e) => {
    const { name, value } = e.target;
    setQuoteDialog({
      ...quoteDialog,
      data: {
        ...quoteDialog.data,
        [name]: value,
      },
    });
  };

  const handleQuoteTagsChange = (event, newValue) => {
    setQuoteDialog({
      ...quoteDialog,
      data: {
        ...quoteDialog.data,
        tags: newValue,
      },
    });
  };

  const handleSaveQuote = async () => {
    setLoading(true);
    try {
      if (quoteDialog.mode === 'add') {
        await api.createQuote(quoteDialog.data);
        setSnackbar({
          open: true,
          message: 'Quote created successfully',
          severity: 'success',
        });
      } else {
        await api.updateQuote(quoteDialog.data._id, quoteDialog.data);
        setSnackbar({
          open: true,
          message: 'Quote updated successfully',
          severity: 'success',
        });
      }
      handleCloseQuoteDialog();
      fetchQuotes();
    } catch (err) {
      console.error('Error saving quote:', err);
      setSnackbar({
        open: true,
        message: `Failed to ${quoteDialog.mode === 'add' ? 'create' : 'update'} quote`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteDialog = (type, id, name) => {
    setDeleteDialog({
      open: true,
      type,
      id,
      name,
    });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      ...deleteDialog,
      open: false,
    });
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (deleteDialog.type === 'quote') {
        await api.deleteQuote(deleteDialog.id);
        setSnackbar({
          open: true,
          message: 'Quote deleted successfully',
          severity: 'success',
        });
        fetchQuotes();
      } else if (deleteDialog.type === 'user') {
        await api.deleteUser(deleteDialog.id);
        setSnackbar({
          open: true,
          message: 'User deleted successfully',
          severity: 'success',
        });
        fetchUsers();
      }
      handleCloseDeleteDialog();
    } catch (err) {
      console.error(`Error deleting ${deleteDialog.type}:`, err);
      setSnackbar({
        open: true,
        message: `Failed to delete ${deleteDialog.type}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportQuotes = async () => {
    try {
      const data = await api.exportQuotes();
      // Create a download link for the JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotes_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: 'Quotes exported successfully',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error exporting quotes:', err);
      setSnackbar({
        open: true,
        message: 'Failed to export quotes',
        severity: 'error',
      });
    }
  };

  const handleImportQuotes = () => {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const quotes = JSON.parse(event.target.result);
              await api.importQuotes(quotes);
              setSnackbar({
                open: true,
                message: 'Quotes imported successfully',
                severity: 'success',
              });
              fetchQuotes();
            } catch (err) {
              console.error('Error parsing or importing quotes:', err);
              setSnackbar({
                open: true,
                message: 'Failed to import quotes: Invalid JSON format',
                severity: 'error',
              });
            }
          };
          reader.readAsText(file);
        } catch (err) {
          console.error('Error reading file:', err);
          setSnackbar({
            open: true,
            message: 'Failed to read import file',
            severity: 'error',
          });
        }
      }
    };
    fileInput.click();
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const renderDashboardTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Users
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <GroupIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
              <Typography variant="h4" component="div">
                {stats?.totalUsers || 0}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Active Users (Last 7 Days)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
              <Typography variant="h4" component="div">
                {stats?.activeUsers || 0}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Quotes
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormatQuoteIcon sx={{ color: theme.palette.secondary.main, mr: 1 }} />
              <Typography variant="h4" component="div">
                {stats?.totalQuotes || 0}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Quotes Served
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <VisibilityIcon sx={{ color: theme.palette.info.main, mr: 1 }} />
              <Typography variant="h4" component="div">
                {stats?.quotesServed || 0}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Quotes
            </Typography>
            {stats?.topQuotes?.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Quote</TableCell>
                    <TableCell align="right">Views</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.topQuotes.map((quote) => (
                    <TableRow key={quote._id}>
                      <TableCell>
                        <Tooltip title={quote.text}>
                          <Typography noWrap sx={{ maxWidth: 250 }}>
                            {quote.text.length > 50 ? `${quote.text.substring(0, 50)}...` : quote.text}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">{quote.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                No data available
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              New Registrations (Last 30 Days)
            </Typography>
            {stats?.newRegistrations?.length > 0 ? (
              <Box sx={{ height: 250, display: 'flex', alignItems: 'flex-end' }}>
                {stats.newRegistrations.map((item, index) => (
                  <Box 
                    key={index}
                    sx={{
                      height: `${(item.count / Math.max(...stats.newRegistrations.map(i => i.count))) * 100}%`,
                      width: `${100 / stats.newRegistrations.length}%`,
                      backgroundColor: theme.palette.primary.main,
                      mx: 0.5,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      position: 'relative',
                      '&:hover::after': {
                        content: `'${item.date}: ${item.count}'`,
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: theme.palette.background.paper,
                        padding: '4px 8px',
                        borderRadius: 1,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        zIndex: 1,
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                No data available
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderUsersTab = () => (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="users table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user._id}</TableCell>
                  <TableCell>{user.displayName || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={user.role === 'admin' ? 'secondary' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{format(new Date(user.createdAt), 'PPP')}</TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleOpenDeleteDialog('user', user._id, user.email)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={usersPagination.totalCount}
        rowsPerPage={usersPagination.rowsPerPage}
        page={usersPagination.page}
        onPageChange={handleUserPageChange}
        onRowsPerPageChange={handleUserRowsPerPageChange}
      />
    </Paper>
  );

  const renderQuotesTab = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenQuoteDialog('add')}
            sx={{ mr: 1 }}
          >
            Add Quote
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchQuotes}
          >
            Refresh
          </Button>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={handleImportQuotes}
            sx={{ mr: 1 }}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExportQuotes}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="quotes table">
            <TableHead>
              <TableRow>
                <TableCell>Text</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Views</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No quotes found
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote._id}>
                    <TableCell>
                      <Tooltip title={quote.text}>
                        <Typography noWrap sx={{ maxWidth: 300 }}>
                          {quote.text.length > 60 ? `${quote.text.substring(0, 60)}...` : quote.text}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{quote.author}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {quote.tags?.map((tag) => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{quote.views || 0}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleOpenQuoteDialog('edit', quote)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleOpenDeleteDialog('quote', quote._id, quote.text.substring(0, 20) + '...')}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={quotesPagination.totalCount}
          rowsPerPage={quotesPagination.rowsPerPage}
          page={quotesPagination.page}
          onPageChange={handleQuotePageChange}
          onRowsPerPageChange={handleQuoteRowsPerPageChange}
        />
      </Paper>
    </Box>
  );

  const renderActivityTab = () => (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="activity table">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : activity.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No activity found
                </TableCell>
              </TableRow>
            ) : (
              activity.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.user?.email || 'Anonymous'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.type} 
                      color={
                        item.type === 'view' ? 'primary' : 
                        item.type === 'favorite' ? 'secondary' : 
                        item.type === 'login' ? 'success' : 
                        'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {item.quote ? (
                      <Tooltip title={`"${item.quote.text}" - ${item.quote.author}`}>
                        <Typography noWrap sx={{ maxWidth: 300 }}>
                          {item.quote.text.length > 40 ? `${item.quote.text.substring(0, 40)}...` : item.quote.text}
                        </Typography>
                      </Tooltip>
                    ) : (
                      item.details || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(item.timestamp), 'PPp')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={activityPagination.totalCount}
        rowsPerPage={activityPagination.rowsPerPage}
        page={activityPagination.page}
        onPageChange={handleActivityPageChange}
        onRowsPerPageChange={handleActivityRowsPerPageChange}
      />
    </Paper>
  );

  if (loading && !stats && tabValue === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<TrendingUpIcon />} label="Dashboard" />
          <Tab icon={<GroupIcon />} label="Users" />
          <Tab icon={<FormatQuoteIcon />} label="Quotes" />
          <Tab icon={<TimelineIcon />} label="Activity" />
        </Tabs>
      </Paper>

      {tabValue === 0 && renderDashboardTab()}
      {tabValue === 1 && renderUsersTab()}
      {tabValue === 2 && renderQuotesTab()}
      {tabValue === 3 && renderActivityTab()}

      {/* Quote Dialog */}
      <Dialog open={quoteDialog.open} onClose={handleCloseQuoteDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {quoteDialog.mode === 'add' ? 'Add New Quote' : 'Edit Quote'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="text"
            label="Quote Text"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={quoteDialog.data.text}
            onChange={handleQuoteDialogChange}
            variant="outlined"
          />
          <TextField
            margin="dense"
            name="author"
            label="Author"
            type="text"
            fullWidth
            value={quoteDialog.data.author}
            onChange={handleQuoteDialogChange}
            variant="outlined"
          />
          <TextField
            margin="dense"
            name="source"
            label="Source (Optional)"
            type="text"
            fullWidth
            value={quoteDialog.data.source}
            onChange={handleQuoteDialogChange}
            variant="outlined"
          />
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={quoteDialog.data.tags}
            onChange={handleQuoteTagsChange}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Tags"
                placeholder="Add tags"
                margin="dense"
                fullWidth
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuoteDialog}>Cancel</Button>
          <Button onClick={handleSaveQuote} variant="contained" disabled={!quoteDialog.data.text || !quoteDialog.data.author}>
            {quoteDialog.mode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {deleteDialog.type}?
            <br />
            <strong>{deleteDialog.name}</strong>
            <br />
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Admin;