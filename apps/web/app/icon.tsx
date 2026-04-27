import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.98), rgba(248,231,205,0.96) 48%, rgba(229,198,149,0.98) 100%)',
        }}
      >
        <div
          style={{
            width: 388,
            height: 388,
            borderRadius: 92,
            border: '14px solid rgba(120,48,35,0.18)',
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(246,232,207,0.96) 48%, rgba(238,214,170,0.98))',
            boxShadow: '0 30px 70px rgba(120,48,35,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 26,
              borderRadius: 74,
              border: '5px solid rgba(120,48,35,0.08)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 44,
              borderRadius: 62,
              background:
                'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.85), rgba(255,255,255,0.0) 72%)',
            }}
          />
          <div
            style={{
              width: 250,
              height: 250,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.92), rgba(218,165,32,0.18) 48%, rgba(120,48,35,0.0) 72%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 28,
                borderRadius: '50%',
                border: '3px solid rgba(120,48,35,0.14)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7a2f22',
                fontSize: 176,
                lineHeight: 1,
                textShadow: '0 3px 0 rgba(255,255,255,0.45)',
              }}
            >
              ☭
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '7px 16px 6px',
                borderRadius: 999,
                border: '2px solid rgba(120,48,35,0.14)',
                background: 'rgba(255,255,255,0.75)',
                color: '#7a2f22',
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              LSC
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
