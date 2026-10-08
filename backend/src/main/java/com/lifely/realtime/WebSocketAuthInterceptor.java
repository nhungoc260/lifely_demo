package com.lifely.realtime;

import com.lifely.auth.JwtService;
import com.lifely.request.RequestAccess;
import com.lifely.user.UserRepository;
import com.lifely.user.UserStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.UUID;

/**
 * Xác thực và phân quyền kênh STOMP:
 *  - CONNECT bắt buộc có header Authorization: Bearer <JWT> hợp lệ của tài khoản ACTIVE;
 *  - SUBSCRIBE /topic/requests/{id} chỉ cho chủ request, chủ tổ chức liên kết hoặc admin;
 *  - SUBSCRIBE /user/queue/notifications chỉ nhận thông báo của chính mình;
 *  - client không được SEND lên server (server là bên duy nhất phát sự kiện).
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String REQUEST_TOPIC = "/topic/requests/";

    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RequestAccess requestAccess;

    public WebSocketAuthInterceptor(JwtService jwtService, UserRepository userRepository, RequestAccess requestAccess) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.requestAccess = requestAccess;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new MessagingException("Unauthorized");
            }
            UUID userId = jwtService.parseUserId(header.substring(7))
                    .filter(id -> userRepository.findById(id).map(u -> u.getStatus() == UserStatus.ACTIVE).orElse(false))
                    .orElseThrow(() -> new MessagingException("Unauthorized"));
            accessor.setUser(new StompPrincipal(userId.toString()));
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            Principal principal = accessor.getUser();
            String destination = accessor.getDestination();
            if (principal == null || destination == null) {
                throw new MessagingException("Unauthorized");
            }
            if (destination.startsWith(REQUEST_TOPIC)) {
                UUID requestId;
                try {
                    requestId = UUID.fromString(destination.substring(REQUEST_TOPIC.length()));
                } catch (IllegalArgumentException e) {
                    throw new MessagingException("Đích đến không hợp lệ");
                }
                if (!requestAccess.canViewById(UUID.fromString(principal.getName()), requestId)) {
                    throw new MessagingException("Forbidden");
                }
            } else if (!"/user/queue/notifications".equals(destination)) {
                throw new MessagingException("Forbidden");
            }
        } else if (StompCommand.SEND.equals(command)) {
            throw new MessagingException("Forbidden");
        }
        return message;
    }
}
