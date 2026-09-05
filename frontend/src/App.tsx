import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { safeJson } from './utils/api';
import { HeaderBar } from './components/HeaderBar';
import { Sidebar } from './components/Sidebar';
import { RetailerDashboard } from './components/RetailerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { RequestHistoryView } from './components/RequestHistoryView';
import { WalletHistoryView } from './components/WalletHistoryView';
import { SupportChatPageView } from './components/SupportChatPageView';
import { UpgradeRolePageView } from './components/UpgradeRolePageView';
import { ProfileView } from './components/ProfileView';
import { LoginModal } from './components/LoginModal';
import { ServiceDetailPageView } from './components/ServiceDetailPageView';
import { AdminServiceLaunchModal } from './components/AdminServiceLaunchModal';
import { WalletModal } from './components/WalletModal';
import { UpgradeIDModal } from './components/UpgradeIDModal';
import { IFSCModal } from './components/IFSCModal';
import { LiveChatDrawer } from './components/LiveChatDrawer';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { SupportTicketPageView } from './components/SupportTicketPageView';
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt';
import { OperatorDashboard } from './components/OperatorDashboard';
import { DistributorPanelView } from './components/DistributorPanelView';
import { ImageCompressorModal } from './components/ImageCompressorModal';
import { UTIPanResizerModal } from './components/UTIPanResizerModal';
import { PassportPhotoModal } from './components/PassportPhotoModal';
import { IDCardPrintModal } from './components/IDCardPrintModal';
import { ECyberCafeIDCardStudio } from './components/ECyberCafeIDCardStudio';
import { PdfPageManagerModal } from './components/PdfPageManagerModal';
import { PdfPageManagerWorkspace } from './components/pdfPageManager/PdfPageManagerWorkspace';
import { JpgToPdfModal } from './components/JpgToPdfModal';
import { JpgToPdfWorkspace } from './components/jpgToPdf/JpgToPdfWorkspace';
import { ResumeMakerModal } from './components/ResumeMakerModal';
import { MarriageBiodataModal } from './components/MarriageBiodataModal';
import { PaymentQRModal } from './components/PaymentQRModal';
import { ImageCropModal } from './components/ImageCropModal';
import { LoginVerificationOverlay } from './components/LoginVerificationOverlay';
import { LandingPageView } from './components/LandingPageView';
import { PublicServiceHub } from './components/PublicServiceHub';
import { PortalServicesView } from './components/PortalServicesView';
import { CitizenService, ServiceRequest } from './types';
import { getServicesWithRecoveryCheck } from './utils/serviceStorage';
import { realtimeClient } from './utils/realtimeClient';
import { ShieldCheck, Phone, Lock, UserCheck, ArrowRight, Sparkles, Building2 } from 'lucide-react';

function MainLayout() {
  const { user, allUsers, loginAs, signupRetailer, refreshUser, logout } = useAuth();

  if (user && user.role === 'OPERATOR') {
    return <OperatorDashboard onLogout={() => logout()} />;
  }

  // Navigation State
  const [activeNav, setActiveNav] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // BroadcastChannel and window message listener for real-time payment auto-close & refresh
  useEffect(() => {
    const handleLoginAsSuccess = () => {
      setActiveNav('home');
    };
    window.addEventListener('login_as_success', handleLoginAsSuccess);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PAYMENT_SUCCESS') {
        window.focus();
        refreshUser();
      }
    };
    window.addEventListener('message', handleMessage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('payment_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'PAYMENT_SUCCESS') {
          window.focus();
          refreshUser();
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('login_as_success', handleLoginAsSuccess);
      window.removeEventListener('message', handleMessage);
      if (channel) channel.close();
    };
  }, []);

  // Requests Data State with local cache for instant 0ms load
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modal States
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isIfscModalOpen, setIsIfscModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginInitialMode, setLoginInitialMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [isCompressorModalOpen, setIsCompressorModalOpen] = useState(false);
  const [isPanResizerOpen, setIsPanResizerOpen] = useState(false);
  const [isPassportPhotoOpen, setIsPassportPhotoOpen] = useState(false);
  const [isIDCardPrintOpen, setIsIDCardPrintOpen] = useState(false);
  const [isPdfPageManagerOpen, setIsPdfPageManagerOpen] = useState(false);
  const [isJpgToPdfOpen, setIsJpgToPdfOpen] = useState(false);
  const [isResumeMakerOpen, setIsResumeMakerOpen] = useState(false);
  const [isMarriageBiodataOpen, setIsMarriageBiodataOpen] = useState(false);
  const [isPaymentQROpen, setIsPaymentQROpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
  const [selectedApplyService, setSelectedApplyService] = useState<CitizenService | null>(null);

  useEffect(() => {
    const handleLoginVerificationStart = () => {
      setIsVerifyingLogin(true);
    };
    window.addEventListener('login_verification_start', handleLoginVerificationStart);
    return () => window.removeEventListener('login_verification_start', handleLoginVerificationStart);
  }, []);

  const handleNavigateToService = (srv: CitizenService) => {
    setSelectedApplyService(srv);
    setActiveNav('service_detail');
    const slug = srv.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    window.location.hash = `services/${slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Chat Drawer State
  const [activeChatRequest, setActiveChatRequest] = useState<ServiceRequest | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openLoginModal = (mode: 'LOGIN' | 'SIGNUP' = 'LOGIN') => {
    setLoginInitialMode(mode);
    setIsLoginModalOpen(true);
  };

  // Auth Form State
  const [showSignup, setShowSignup] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupStore, setSignupStore] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  // Load cached requests on user login / change
  useEffect(() => {
    if (user?.id) {
      try {
        const cached = localStorage.getItem(`ecyber_cached_requests_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setRequests(parsed);
        }
      } catch (e) {}
    } else {
      setRequests([]);
    }
  }, [user?.id]);

  const fetchRequests = async (showSyncIndicator = false) => {
    if (!user) return;
    if (showSyncIndicator) setIsSyncing(true);
    if (requests.length === 0) {
      setIsRequestsLoading(true);
    }
    try {
      const url = user.role === 'ADMIN' ? '/api/requests' : `/api/requests?retailerId=${user.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await safeJson(res, []);
        if (Array.isArray(data)) {
          setRequests(data);
          try {
            localStorage.setItem(`ecyber_cached_requests_${user.id}`, JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequestsLoading(false);
      if (showSyncIndicator) {
        setTimeout(() => setIsSyncing(false), 400);
      }
    }
  };

  const refreshAllData = async () => {
    setIsSyncing(true);
    await Promise.all([
      refreshUser(),
      fetchRequests(true)
    ]);
  };

  useEffect(() => {
    if (user) {
      fetchRequests();

      // Refresh on window focus or tab visibility change (instant sync when switching back to app)
      const handleFocus = () => {
        fetchRequests();
        refreshUser();
      };
      window.addEventListener('focus', handleFocus);
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          handleFocus();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Setup Shared Server-Sent Events (SSE) for real-time order & chat updates
      const unsubscribeRealtime = realtimeClient.subscribe((payload) => {
        try {
          if (
            payload.type === 'REQUEST_CREATED' ||
            payload.type === 'REQUEST_STATUS_UPDATED' ||
            payload.type === 'SERVICE_LAUNCHED' ||
            payload.type === 'WALLET_RECHARGED'
          ) {
            fetchRequests();
            refreshUser();
          }
          if (
            payload.type === 'SERVICE_UPDATED' ||
            payload.type === 'SERVICES_UPDATED' ||
            payload.type === 'SERVICE_LAUNCHED' ||
            payload.type === 'SERVICE_DELETED'
          ) {
            window.dispatchEvent(new CustomEvent('services_updated'));
            window.dispatchEvent(new CustomEvent('SERVICE_UPDATED'));
          }
          if (payload.type === 'SETTINGS_UPDATED') {
            window.dispatchEvent(new CustomEvent('settings_updated'));
          }
        } catch (e) {
          console.error(e);
        }
      });

      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        unsubscribeRealtime();
      };
    }
  }, [user?.id]);

  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#services/') || hash.startsWith('#service/')) {
        const slug = hash.replace(/^#(services|service)\//, '');

        // 1. Instant check from localStorage cache (0ms)
        const cachedServices = getServicesWithRecoveryCheck() || [];
        const localMatch = cachedServices.find(s => 
          s.id === slug || s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
        );
        if (localMatch) {
          setSelectedApplyService(localMatch);
          setActiveNav('service_detail');
        }

        // 2. Background revalidation from server
        try {
          const res = await fetch('/api/services');
          if (res.ok) {
            const servicesList: CitizenService[] = (await safeJson(res, [])) || [];
            const matched = servicesList.find(s => 
              s.id === slug || s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
            );
            if (matched) {
              setSelectedApplyService(matched);
              setActiveNav('service_detail');
            }
          }
        } catch (e) {}
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenChat = (request: ServiceRequest) => {
    setActiveChatRequest(request);
    setIsChatOpen(true);
  };

  const downloadEditedImage = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupName && signupMobile && signupEmail) {
      const success = await signupRetailer(signupName, signupStore, signupEmail, signupMobile);
      if (success) {
        window.dispatchEvent(new CustomEvent('login_verification_start'));
        setShowSignup(false);
      }
    }
  };

  if (!user) {
    return (
      <>
        <LandingPageView
          onOpenLoginModal={openLoginModal}
          onOpenCropModal={() => setIsCropModalOpen(true)}
          onOpenPanResizer={() => setIsPanResizerOpen(true)}
          onOpenPassportPhoto={() => setIsPassportPhotoOpen(true)}
          onOpenIDCardPrint={() => setIsIDCardPrintOpen(true)}
          onOpenPdfPageManager={() => setIsPdfPageManagerOpen(true)}
          onOpenJpgToPdf={() => setIsJpgToPdfOpen(true)}
          onOpenResumeMaker={() => setIsResumeMakerOpen(true)}
          onOpenMarriageBiodata={() => setIsMarriageBiodataOpen(true)}
        />

        {/* JPG to PDF Combiner Modal (100% Public Access) */}
        <JpgToPdfModal
          isOpen={isJpgToPdfOpen}
          onClose={() => setIsJpgToPdfOpen(false)}
          onNavigateToCompressor={() => {
            setIsJpgToPdfOpen(false);
            setIsCompressorModalOpen(true);
          }}
          onNavigateToPdfPageManager={() => {
            setIsJpgToPdfOpen(false);
            setIsPdfPageManagerOpen(true);
          }}
          onNavigateToPassport={() => {
            setIsJpgToPdfOpen(false);
            setIsPassportPhotoOpen(true);
          }}
          onNavigateToIDCard={() => {
            setIsJpgToPdfOpen(false);
            setIsIDCardPrintOpen(true);
          }}
        />

        {/* PDF Page Manager Modal (100% Public Access) */}
        <PdfPageManagerModal
          isOpen={isPdfPageManagerOpen}
          onClose={() => setIsPdfPageManagerOpen(false)}
          onNavigateToCompressor={() => {
            setIsPdfPageManagerOpen(false);
            setIsCompressorModalOpen(true);
          }}
          onNavigateToIDCard={() => {
            setIsPdfPageManagerOpen(false);
            setIsIDCardPrintOpen(true);
          }}
          onNavigateToPassport={() => {
            setIsPdfPageManagerOpen(false);
            setIsPassportPhotoOpen(true);
          }}
          onNavigateToCrop={() => {
            setIsPdfPageManagerOpen(false);
            setIsCropModalOpen(true);
          }}
        />

        {/* Passport Photo Studio Modal (100% Public Access) */}
        <PassportPhotoModal
          isOpen={isPassportPhotoOpen}
          onClose={() => setIsPassportPhotoOpen(false)}
        />

        {/* Login Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          initialMode={loginInitialMode}
          onClose={() => setIsLoginModalOpen(false)}
        />

        {/* Standalone Photo Crop / Resize / Stretch Tool */}
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          autoUpload={false}
          title="Photo Crop, Resize & Stretch"
          onApplyCroppedImage={downloadEditedImage}
        />

        <ResumeMakerModal
          isOpen={isResumeMakerOpen}
          onClose={() => setIsResumeMakerOpen(false)}
        />

        <MarriageBiodataModal
          isOpen={isMarriageBiodataOpen}
          onClose={() => setIsMarriageBiodataOpen(false)}
        />

        {/* UTI PAN Photo & Signature Resizer Modal */}
        <UTIPanResizerModal
          isOpen={isPanResizerOpen}
          onClose={() => setIsPanResizerOpen(false)}
        />

        {/* eCyberCafe.in ID Card Print Studio Modal */}
        <IDCardPrintModal
          isOpen={isIDCardPrintOpen}
          onClose={() => setIsIDCardPrintOpen(false)}
        />

        {/* Login Verification Overlay */}
        <LoginVerificationOverlay
          user={user}
          isOpen={isVerifyingLogin}
          onComplete={() => setIsVerifyingLogin(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#111827] flex font-sans overflow-x-hidden w-full max-w-full selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Left Navigation */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isOpenMobile={isSidebarOpen}
        setIsOpenMobile={setIsSidebarOpen}
        onOpenWallet={() => setActiveNav('wallet')}
        onOpenNewServiceLaunch={() => setIsLaunchModalOpen(true)}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        onOpenIfscModal={() => setIsIfscModalOpen(true)}
        onOpenSupportChat={() => setActiveNav('support_chat')}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenCompressorModal={() => setIsCompressorModalOpen(true)}
        onOpenPassportPhoto={() => setIsPassportPhotoOpen(true)}
        onOpenIDCardPrint={() => setActiveNav('id_card_print')}
        onOpenPdfPageManager={() => setIsPdfPageManagerOpen(true)}
        onOpenJpgToPdf={() => setIsJpgToPdfOpen(true)}
      />

      {/* Main Content & Header Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <HeaderBar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          onOpenWallet={() => setActiveNav('wallet')}
          onOpenNewServiceLaunch={() => setIsLaunchModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenSupportChat={() => setActiveNav('support_chat')}
          onOpenCompressorModal={() => setIsCompressorModalOpen(true)}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onRefreshAllData={refreshAllData}
          isSyncing={isSyncing}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-32 lg:pb-12 min-w-0">
          {(activeNav === 'home' || activeNav === 'services' || activeNav === 'dashboard') && (
            user.role === 'ADMIN' ? (
              <AdminDashboard
                onOpenNewServiceLaunch={() => setIsLaunchModalOpen(true)}
                onOpenChat={handleOpenChat}
              />
            ) : (
              <RetailerDashboard
                onOpenServiceModal={(srv) => handleNavigateToService(srv)}
                onOpenWalletModal={() => setActiveNav('wallet')}
                onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
                onOpenIfscModal={() => setIsIfscModalOpen(true)}
                onOpenPassportPhoto={() => setIsPassportPhotoOpen(true)}
                onOpenIDCardPrint={() => setActiveNav('id_card_print')}
                onOpenPdfPageManager={() => setIsPdfPageManagerOpen(true)}
                onOpenJpgToPdf={() => setIsJpgToPdfOpen(true)}
                onOpenCompressorModal={() => setIsCompressorModalOpen(true)}
                onOpenPanResizer={() => setIsPanResizerOpen(true)}
                onNavigate={(nav) => setActiveNav(nav)}
                requests={requests}
              />
            )
          )}

          {activeNav === 'history' && (
            <RequestHistoryView
              requests={requests}
              userRole={user.role}
              onOpenChat={handleOpenChat}
              onStatusUpdated={refreshAllData}
              isRequestsLoading={isRequestsLoading}
            />
          )}

          {activeNav === 'wallet' && (
            <WalletHistoryView onOpenTopupModal={() => setActiveNav('wallet')} />
          )}

          {activeNav === 'distributor_panel' && (
            <DistributorPanelView />
          )}

          {activeNav === 'portal_services' && (
            <PortalServicesView />
          )}

          {activeNav === 'user_list' && (
            user.role === 'ADMIN' ? (
              <AdminDashboard
                initialTab="retailers"
                onOpenNewServiceLaunch={() => setIsLaunchModalOpen(true)}
                onOpenChat={handleOpenChat}
              />
            ) : ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD'].includes(user.role) ? (
              <DistributorPanelView />
            ) : (
              <RetailerDashboard
                onOpenServiceModal={(srv) => handleNavigateToService(srv)}
                onOpenWalletModal={() => setActiveNav('wallet')}
                onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
                onOpenIfscModal={() => setIsIfscModalOpen(true)}
                onOpenPassportPhoto={() => setIsPassportPhotoOpen(true)}
                onOpenIDCardPrint={() => setActiveNav('id_card_print')}
                onOpenPdfPageManager={() => setIsPdfPageManagerOpen(true)}
                onOpenJpgToPdf={() => setIsJpgToPdfOpen(true)}
                onOpenCompressorModal={() => setIsCompressorModalOpen(true)}
                onOpenPanResizer={() => setIsPanResizerOpen(true)}
                onNavigate={(nav) => setActiveNav(nav)}
                requests={requests}
              />
            )
          )}

          {(activeNav === 'tickets' || activeNav === 'support_chat' || activeNav === 'support') && (
            <SupportTicketPageView />
          )}

          {activeNav === 'upgrade' && (
            <UpgradeRolePageView
              onOpenWalletModal={() => setActiveNav('wallet')}
              onOpenDistributorPanel={() => setActiveNav('distributor_panel')}
            />
          )}

          {activeNav === 'profile' && (
            <ProfileView defaultTab="profile" />
          )}

          {activeNav === 'password' && (
            <ProfileView defaultTab="password" />
          )}

          {activeNav === 'id_card_print' && (
            <ECyberCafeIDCardStudio onBackToHome={() => setActiveNav('home')} />
          )}

          {activeNav === 'jpg_to_pdf' && (
            <JpgToPdfWorkspace
              onBackToHome={() => setActiveNav('home')}
              onNavigateToCompressor={() => setIsCompressorModalOpen(true)}
              onNavigateToPdfPageManager={() => setIsPdfPageManagerOpen(true)}
              onNavigateToPassport={() => setIsPassportPhotoOpen(true)}
              onNavigateToIDCard={() => setActiveNav('id_card_print')}
            />
          )}

          {activeNav === 'pdf_page_manager' && (
            <PdfPageManagerWorkspace
              onBackToHome={() => setActiveNav('home')}
              onNavigateToCompressor={() => setIsCompressorModalOpen(true)}
              onNavigateToIDCard={() => setActiveNav('id_card_print')}
              onNavigateToPassport={() => setIsPassportPhotoOpen(true)}
              onNavigateToCrop={() => setIsCropModalOpen(true)}
            />
          )}

          {activeNav === 'service_detail' && selectedApplyService && (
            <ServiceDetailPageView
              service={selectedApplyService}
              requests={requests}
              onBack={() => {
                setSelectedApplyService(null);
                setActiveNav('home');
                window.location.hash = '';
              }}
              onOpenWallet={() => setActiveNav('wallet')}
              onRequestSubmittedSuccess={(reqId) => {
                fetchRequests();
              }}
              onOpenChat={handleOpenChat}
            />
          )}
        </main>
      </div>

      {/* WhatsApp Floating Contact Widget */}
      <WhatsAppWidget onOpenSupportChat={() => setActiveNav('tickets')} />

      {/* Modals & Drawers */}
      <AdminServiceLaunchModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        onServiceLaunched={() => {
          setIsLaunchModalOpen(false);
          fetchRequests();
        }}
      />

      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />

      <UpgradeIDModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgradeSuccess={() => {}}
      />

      <IFSCModal
        isOpen={isIfscModalOpen}
        onClose={() => setIsIfscModalOpen(false)}
        onOpenWallet={() => {
          setIsIfscModalOpen(false);
          setActiveNav('wallet');
        }}
      />

      <LiveChatDrawer
        request={activeChatRequest}
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setActiveChatRequest(null);
        }}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        initialMode={loginInitialMode}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <LoginVerificationOverlay
        user={user}
        isOpen={isVerifyingLogin}
        onComplete={() => setIsVerifyingLogin(false)}
      />

      <ImageCompressorModal
        isOpen={isCompressorModalOpen}
        onClose={() => setIsCompressorModalOpen(false)}
      />

      <MarriageBiodataModal
        isOpen={isMarriageBiodataOpen}
        onClose={() => setIsMarriageBiodataOpen(false)}
      />

      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        autoUpload={false}
        title="Photo Crop, Resize & Stretch"
        onApplyCroppedImage={downloadEditedImage}
      />

      <IDCardPrintModal
        isOpen={isIDCardPrintOpen}
        onClose={() => setIsIDCardPrintOpen(false)}
      />

      <JpgToPdfModal
        isOpen={isJpgToPdfOpen}
        onClose={() => setIsJpgToPdfOpen(false)}
        onNavigateToCompressor={() => {
          setIsJpgToPdfOpen(false);
          setIsCompressorModalOpen(true);
        }}
        onNavigateToPdfPageManager={() => {
          setIsJpgToPdfOpen(false);
          setIsPdfPageManagerOpen(true);
        }}
        onNavigateToPassport={() => {
          setIsJpgToPdfOpen(false);
          setIsPassportPhotoOpen(true);
        }}
        onNavigateToIDCard={() => {
          setIsJpgToPdfOpen(false);
          setActiveNav('id_card_print');
        }}
      />

      <PdfPageManagerModal
        isOpen={isPdfPageManagerOpen}
        onClose={() => setIsPdfPageManagerOpen(false)}
        onNavigateToCompressor={() => {
          setIsPdfPageManagerOpen(false);
          setIsCompressorModalOpen(true);
        }}
        onNavigateToIDCard={() => {
          setIsPdfPageManagerOpen(false);
          setActiveNav('id_card_print');
        }}
        onNavigateToPassport={() => {
          setIsPdfPageManagerOpen(false);
          setIsPassportPhotoOpen(true);
        }}
        onNavigateToCrop={() => {
          setIsPdfPageManagerOpen(false);
          setIsCropModalOpen(true);
        }}
      />

      <PassportPhotoModal
        isOpen={isPassportPhotoOpen}
        onClose={() => setIsPassportPhotoOpen(false)}
      />

      <UTIPanResizerModal
        isOpen={isPanResizerOpen}
        onClose={() => setIsPanResizerOpen(false)}
      />

      <NotificationPermissionPrompt />
      <GlobalToastContainer />
    </div>
  );
}

interface AppToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

function GlobalToastContainer() {
  const [toasts, setToasts] = useState<AppToastItem[]>([]);

  useEffect(() => {
    const handleAlertEvent = (e: CustomEvent) => {
      const msg = typeof e.detail === 'object' ? JSON.stringify(e.detail, null, 2) : String(e.detail || '');
      if (!msg) return;
      const id = `toast_${Date.now()}_${Math.random()}`;

      let type: 'info' | 'success' | 'error' | 'warning' = 'info';
      if (msg.includes('❌') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('error')) {
        type = 'error';
      } else if (msg.includes('🎉') || msg.includes('✅') || msg.toLowerCase().includes('success')) {
        type = 'success';
      } else if (msg.includes('⚠️') || msg.toLowerCase().includes('warning')) {
        type = 'warning';
      }

      setToasts(prev => [...prev.slice(-4), { id, message: msg, type }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 7000);
    };

    window.alert = (msg?: any) => {
      const text = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg ?? '');
      window.dispatchEvent(new CustomEvent('app_toast', { detail: text }));
    };

    window.addEventListener('app_toast', handleAlertEvent as EventListener);
    return () => {
      window.removeEventListener('app_toast', handleAlertEvent as EventListener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] max-w-md w-full space-y-2 pointer-events-none px-3">
      {toasts.map(toast => {
        const isErr = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        const isWarn = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-slide-in flex items-start gap-3 ${
              isErr
                ? 'bg-slate-900/95 border-rose-500/50 text-rose-200 shadow-rose-900/30'
                : isSuccess
                ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30'
                : isWarn
                ? 'bg-slate-900/95 border-amber-500/50 text-amber-200 shadow-amber-900/30'
                : 'bg-slate-900/95 border-indigo-500/50 text-slate-100 shadow-indigo-900/30'
            }`}
          >
            <div className="shrink-0 mt-0.5 text-base">
              {isErr ? '❌' : isSuccess ? '🎉' : isWarn ? '⚠️' : 'ℹ️'}
            </div>
            <div className="flex-1 text-xs whitespace-pre-wrap font-sans leading-relaxed break-words max-h-60 overflow-y-auto">
              {toast.message}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1 cursor-pointer font-bold shrink-0 text-sm"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
