'use client';

import React from 'react';
import { 
  Package, 
  Warehouse, 
  Boxes, 
  Wrench, 
  Truck, 
  Building2, 
  Users, 
  UserCog,
  Ruler,
  Square,
  Layers,
  Hammer,
  HardHat,
  ClipboardCheck,
  Activity
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AnimatedIcon {
  icon: React.ReactNode;
  top: string;
  left?: string;
  right?: string;
  animationDelay: string;
  animationDuration: string;
  size: number;
}

const ConstructionBackground: React.FC = () => {
  const { isDark } = useTheme();
  const iconColor = isDark ? '#C2D642' : '#C2D642';
  const iconOpacity = isDark ? 0.6 : 0.7;

  // Asset icons
  const assetIcons: AnimatedIcon[] = [
    {
      icon: <Package size={24} />,
      top: '10%',
      left: '5%',
      animationDelay: '0s',
      animationDuration: '15s',
      size: 24
    },
    {
      icon: <Warehouse size={28} />,
      top: '25%',
      left: '12%',
      animationDelay: '2s',
      animationDuration: '18s',
      size: 28
    },
    {
      icon: <Boxes size={22} />,
      top: '40%',
      left: '8%',
      animationDelay: '4s',
      animationDuration: '16s',
      size: 22
    },
    {
      icon: <Package size={26} />,
      top: '55%',
      left: '6%',
      animationDelay: '1s',
      animationDuration: '17s',
      size: 26
    },
    {
      icon: <Warehouse size={30} />,
      top: '70%',
      left: '10%',
      animationDelay: '3s',
      animationDuration: '19s',
      size: 30
    },
  ];

  // Machinery icons
  const machineryIcons: AnimatedIcon[] = [
    {
      icon: <Wrench size={26} />,
      top: '15%',
      right: '8%',
      animationDelay: '1s',
      animationDuration: '14s',
      size: 26
    },
    {
      icon: <Truck size={32} />,
      top: '30%',
      right: '12%',
      animationDelay: '3s',
      animationDuration: '20s',
      size: 32
    },
    {
      icon: <Building2 size={28} />,
      top: '45%',
      right: '6%',
      animationDelay: '2s',
      animationDuration: '16s',
      size: 28
    },
    {
      icon: <Hammer size={24} />,
      top: '60%',
      right: '10%',
      animationDelay: '4s',
      animationDuration: '15s',
      size: 24
    },
    {
      icon: <Wrench size={30} />,
      top: '75%',
      right: '7%',
      animationDelay: '0.5s',
      animationDuration: '18s',
      size: 30
    },
  ];

  // Labour icons
  const labourIcons: AnimatedIcon[] = [
    {
      icon: <Users size={28} />,
      top: '20%',
      left: '50%',
      animationDelay: '2s',
      animationDuration: '13s',
      size: 28
    },
    {
      icon: <UserCog size={26} />,
      top: '35%',
      left: '45%',
      animationDelay: '1s',
      animationDuration: '14s',
      size: 26
    },
    {
      icon: <HardHat size={30} />,
      top: '50%',
      left: '52%',
      animationDelay: '3s',
      animationDuration: '15s',
      size: 30
    },
    {
      icon: <Users size={24} />,
      top: '65%',
      left: '48%',
      animationDelay: '0.5s',
      animationDuration: '16s',
      size: 24
    },
  ];

  // Units/Measurements icons
  const unitsIcons: AnimatedIcon[] = [
    {
      icon: <Ruler size={22} />,
      top: '12%',
      left: '30%',
      animationDelay: '1.5s',
      animationDuration: '12s',
      size: 22
    },
    {
      icon: <Square size={20} />,
      top: '28%',
      left: '35%',
      animationDelay: '2.5s',
      animationDuration: '11s',
      size: 20
    },
    {
      icon: <Layers size={26} />,
      top: '42%',
      left: '28%',
      animationDelay: '0.5s',
      animationDuration: '13s',
      size: 26
    },
    {
      icon: <Ruler size={24} />,
      top: '58%',
      left: '32%',
      animationDelay: '3.5s',
      animationDuration: '14s',
      size: 24
    },
    {
      icon: <Square size={22} />,
      top: '72%',
      left: '30%',
      animationDelay: '1s',
      animationDuration: '12s',
      size: 22
    },
  ];

  // Construction activity icons
  const activityIcons: AnimatedIcon[] = [
    {
      icon: <ClipboardCheck size={24} />,
      top: '18%',
      right: '30%',
      animationDelay: '2s',
      animationDuration: '14s',
      size: 24
    },
    {
      icon: <Activity size={26} />,
      top: '33%',
      right: '35%',
      animationDelay: '1s',
      animationDuration: '15s',
      size: 26
    },
    {
      icon: <Building2 size={28} />,
      top: '48%',
      right: '28%',
      animationDelay: '3s',
      animationDuration: '16s',
      size: 28
    },
    {
      icon: <Layers size={22} />,
      top: '63%',
      right: '32%',
      animationDelay: '0.5s',
      animationDuration: '13s',
      size: 22
    },
  ];

  const renderAnimatedIcon = (iconData: AnimatedIcon, index: string | number) => {
    return (
      <div
        key={index}
        className="construction-icon"
        style={{
          position: 'absolute',
          top: iconData.top,
          ...(iconData.left ? { left: iconData.left } : {}),
          ...(iconData.right ? { right: iconData.right } : {}),
          color: iconColor,
          opacity: iconOpacity,
          animation: `float ${iconData.animationDuration} ease-in-out infinite`,
          animationDelay: iconData.animationDelay,
          transform: 'translateZ(0)',
        }}
      >
        {iconData.icon}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-15px) translateX(10px) rotate(5deg);
          }
          50% {
            transform: translateY(-25px) translateX(0px) rotate(0deg);
          }
          75% {
            transform: translateY(-15px) translateX(-10px) rotate(-5deg);
          }
        }
        @keyframes slideRight {
          0% {
            transform: translateX(-100px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: ${iconOpacity};
          }
          90% {
            opacity: ${iconOpacity};
          }
          100% {
            transform: translateX(calc(100vw + 100px)) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes slideLeft {
          0% {
            transform: translateX(calc(100vw + 100px)) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: ${iconOpacity};
          }
          90% {
            opacity: ${iconOpacity};
          }
          100% {
            transform: translateX(-100px) rotate(-360deg);
            opacity: 0;
          }
        }
        @keyframes rotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: ${iconOpacity * 0.5};
            transform: scale(1);
          }
          50% {
            opacity: ${iconOpacity};
            transform: scale(1.1);
          }
        }
        @keyframes buildUp {
          0% {
            transform: translateY(100px) scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: ${iconOpacity};
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: ${iconOpacity * 0.7};
          }
        }
        .construction-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent;
        }
        .construction-icon {
          will-change: transform;
          backface-visibility: hidden;
        }
        .sliding-icon {
          position: absolute;
          opacity: ${iconOpacity};
        }
      `}</style>
      <div className="construction-bg">
        {/* Grid Pattern Background */}
        <svg 
          width="100%" 
          height="100%" 
          style={{ 
            position: 'absolute',
            opacity: isDark ? 0.15 : 0.2,
            top: 0,
            left: 0
          }}
        >
          <defs>
            <pattern id="construction-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path 
                d="M 60 0 L 0 0 0 60" 
                fill="none" 
                stroke={iconColor} 
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#construction-grid)" />
        </svg>

        {/* Asset Icons */}
        {assetIcons.map((icon, index) => renderAnimatedIcon(icon, `asset-${index}`))}

        {/* Machinery Icons */}
        {machineryIcons.map((icon, index) => renderAnimatedIcon(icon, `machinery-${index}`))}

        {/* Labour Icons */}
        {labourIcons.map((icon, index) => renderAnimatedIcon(icon, `labour-${index}`))}

        {/* Units/Measurements Icons */}
        {unitsIcons.map((icon, index) => renderAnimatedIcon(icon, `units-${index}`))}

        {/* Activity Icons */}
        {activityIcons.map((icon, index) => renderAnimatedIcon(icon, `activity-${index}`))}

        {/* Sliding Icons - Moving across screen */}
        <div 
          className="sliding-icon"
          style={{
            top: '20%',
            animation: 'slideRight 25s linear infinite',
            animationDelay: '0s',
            color: iconColor,
          }}
        >
          <Package size={20} />
        </div>
        <div 
          className="sliding-icon"
          style={{
            top: '50%',
            animation: 'slideLeft 30s linear infinite',
            animationDelay: '5s',
            color: iconColor,
          }}
        >
          <Truck size={24} />
        </div>
        <div 
          className="sliding-icon"
          style={{
            top: '80%',
            animation: 'slideRight 28s linear infinite',
            animationDelay: '10s',
            color: iconColor,
          }}
        >
          <Users size={22} />
        </div>

        {/* Rotating Construction Elements */}
        <div
          className="construction-icon"
          style={{
            position: 'absolute',
            top: '30%',
            right: '25%',
            color: iconColor,
            opacity: iconOpacity * 0.8,
            animation: 'rotate 20s linear infinite',
          }}
        >
          <Wrench size={32} />
        </div>
        <div
          className="construction-icon"
          style={{
            position: 'absolute',
            top: '60%',
            left: '20%',
            color: iconColor,
            opacity: iconOpacity * 0.8,
            animation: 'rotate 25s linear infinite reverse',
          }}
        >
          <Ruler size={28} />
        </div>

        {/* Pulsing Elements */}
        <div
          className="construction-icon"
          style={{
            position: 'absolute',
            top: '15%',
            left: '40%',
            color: iconColor,
            animation: 'pulse 4s ease-in-out infinite',
          }}
        >
          <HardHat size={26} />
        </div>
        <div
          className="construction-icon"
          style={{
            position: 'absolute',
            top: '85%',
            right: '40%',
            color: iconColor,
            animation: 'pulse 5s ease-in-out infinite',
            animationDelay: '2s',
          }}
        >
          <ClipboardCheck size={24} />
        </div>
      </div>
    </>
  );
};

export default ConstructionBackground;
