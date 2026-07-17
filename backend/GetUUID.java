import java.util.UUID;

public class GetUUID {
    public static void main(String[] args) {
        System.out.println("UUID: " + UUID.nameUUIDFromBytes("BCEAO-BANK-CORIBFBF".getBytes()));
    }
}
