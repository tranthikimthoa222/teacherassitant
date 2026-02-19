
import React, { useState } from 'react';
import { X, MessageCircle, FolderOpen, BarChart3, RefreshCw, Moon, Keyboard, Download } from 'lucide-react';

const ONBOARDING_KEY = 'onboarding_completed';

interface OnboardingStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    position: string; // CSS hint for placement
}

const STEPS: OnboardingStep[] = [
    {
        title: '💬 Trò chuyện với AI',
        description: 'Nhập câu hỏi và nhận câu trả lời chuyên nghiệp. Sử dụng "/" để truy cập nhanh các mẫu prompt.',
        icon: <MessageCircle size={24} />,
        position: 'center',
    },
    {
        title: '📁 Thư mục & Tags',
        description: 'Sắp xếp cuộc trò chuyện vào thư mục. Hệ thống tự động gắn tag (Giáo án, Đề thi, Nhận xét...).',
        icon: <FolderOpen size={24} />,
        position: 'left',
    },
    {
        title: '📊 Dashboard Thống kê',
        description: 'Xem tổng quan hoạt động: số chat, tin nhắn, thời gian tiết kiệm. Click nút "Thống kê" ở sidebar.',
        icon: <BarChart3 size={24} />,
        position: 'left',
    },
    {
        title: '🔄 Tạo lại câu trả lời',
        description: 'Hover vào tin nhắn AI → Click "Tạo lại" để sinh phiên bản mới. Xem lại các phiên bản cũ bất cứ lúc nào.',
        icon: <RefreshCw size={24} />,
        position: 'center',
    },
    {
        title: '🌙 Chế độ tối',
        description: 'Click biểu tượng mặt trăng trên header hoặc nhấn Ctrl+D để chuyển sang dark mode.',
        icon: <Moon size={24} />,
        position: 'right',
    },
    {
        title: '⌨️ Phím tắt',
        description: 'Ctrl+N: Chat mới • Ctrl+/: Mẫu prompt • Ctrl+K: Tìm kiếm • Ctrl+D: Dark mode',
        icon: <Keyboard size={24} />,
        position: 'center',
    },
    {
        title: '📥 Tải xuống & PDF',
        description: 'Xuất cuộc trò chuyện thành Markdown, Word hoặc PDF. Click nút "Tải xuống" trên header.',
        icon: <Download size={24} />,
        position: 'right',
    },
];

interface OnboardingTourProps {
    onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const progress = ((step + 1) / STEPS.length) * 100;

    const handleNext = () => {
        if (isLast) {
            localStorage.setItem(ONBOARDING_KEY, 'true');
            setVisible(false);
            onComplete();
        } else {
            setStep(step + 1);
        }
    };

    const handleSkip = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setVisible(false);
        onComplete();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden onboarding-tooltip">
                {/* Progress bar */}
                <div className="h-1 bg-gray-100">
                    <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                        {step + 1} / {STEPS.length}
                    </span>
                    <button
                        onClick={handleSkip}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg">
                            {current.icon}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{current.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-6">
                        {current.description}
                    </p>

                    {/* Dots */}
                    <div className="flex items-center justify-center gap-1.5 mb-5">
                        {STEPS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setStep(i)}
                                className={`rounded-full transition-all duration-300 ${i === step
                                    ? 'w-6 h-2 bg-teal-500'
                                    : i < step
                                        ? 'w-2 h-2 bg-teal-300'
                                        : 'w-2 h-2 bg-gray-200'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                ← Quay lại
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-xl shadow-lg shadow-teal-500/25 transition-all active:scale-95"
                        >
                            {isLast ? '🎉 Bắt đầu sử dụng!' : 'Tiếp theo →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const shouldShowOnboarding = (): boolean => {
    return !localStorage.getItem(ONBOARDING_KEY);
};
